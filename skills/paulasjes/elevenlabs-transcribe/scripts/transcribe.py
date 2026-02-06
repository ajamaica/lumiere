#!/usr/bin/env python3
"""
ElevenLabs Speech-to-Text transcription script.
Supports batch transcription and realtime streaming (URL, mic, file).
"""

import argparse
import asyncio
import base64
import json
import os
import sys
from pathlib import Path

from dotenv import load_dotenv
from elevenlabs import ElevenLabs

load_dotenv()


def get_client() -> ElevenLabs:
    """Get ElevenLabs client with API key from environment."""
    api_key = os.getenv("ELEVENLABS_API_KEY")
    if not api_key:
        print("Error: ELEVENLABS_API_KEY not set", file=sys.stderr)
        sys.exit(1)
    return ElevenLabs(api_key=api_key)


def batch_transcribe(
    file_path: str,
    diarize: bool = False,
    language: str | None = None,
    tag_events: bool = False,
    json_output: bool = False,
) -> None:
    """Batch transcription using scribe_v2 model."""
    client = get_client()

    with open(file_path, "rb") as audio_file:
        result = client.speech_to_text.convert(
            file=audio_file,
            model_id="scribe_v2",
            diarize=diarize,
            tag_audio_events=tag_events,
            **({"language_code": language} if language else {}),
        )

    if json_output:
        # Convert to dict for JSON output
        output = {
            "text": result.text,
            "language_code": result.language_code,
            "language_probability": result.language_probability,
        }
        if hasattr(result, "words") and result.words:
            output["words"] = [
                {
                    "text": w.text,
                    "start": w.start,
                    "end": w.end,
                    "type": w.type,
                    **({"speaker_id": w.speaker_id} if hasattr(w, "speaker_id") and w.speaker_id else {}),
                }
                for w in result.words
            ]
        print(json.dumps(output, indent=2))
    else:
        print(result.text)


async def realtime_from_url(
    url: str,
    show_partials: bool = False,
    language: str | None = None,
    json_output: bool = False,
) -> None:
    """Realtime transcription from URL stream."""
    from elevenlabs import RealtimeEvents, RealtimeUrlOptions

    client = get_client()
    stop_event = asyncio.Event()
    transcripts: list[str] = []

    connection = await client.speech_to_text.realtime.connect(
        RealtimeUrlOptions(
            model_id="scribe_v2_realtime",
            url=url,
            include_timestamps=True,
            **({"language_code": language} if language else {}),
        )
    )

    def on_partial_transcript(data):
        if show_partials:
            text = data.get("text", "")
            if text:
                if json_output:
                    print(json.dumps({"type": "partial", "text": text}))
                else:
                    print(f"[partial] {text}")

    def on_committed_transcript(data):
        text = data.get("text", "")
        if text:
            transcripts.append(text)
            if json_output:
                print(json.dumps({"type": "final", "text": text}))
            else:
                print(text)

    def on_error(error):
        print(f"Error: {error}", file=sys.stderr)
        stop_event.set()

    def on_close():
        stop_event.set()

    connection.on(RealtimeEvents.PARTIAL_TRANSCRIPT, on_partial_transcript)
    connection.on(RealtimeEvents.COMMITTED_TRANSCRIPT, on_committed_transcript)
    connection.on(RealtimeEvents.ERROR, on_error)
    connection.on(RealtimeEvents.CLOSE, on_close)

    try:
        await stop_event.wait()
    except KeyboardInterrupt:
        pass
    finally:
        await connection.close()


async def realtime_from_mic(
    show_partials: bool = False,
    language: str | None = None,
    json_output: bool = False,
    quiet: bool = False,
) -> None:
    """Realtime transcription from microphone."""
    import sounddevice as sd
    from elevenlabs import AudioFormat, CommitStrategy, RealtimeAudioOptions, RealtimeEvents

    client = get_client()
    stop_event = asyncio.Event()
    audio_queue: asyncio.Queue[bytes] = asyncio.Queue()

    SAMPLE_RATE = 16000
    CHUNK_DURATION = 0.1  # 100ms chunks

    connection = await client.speech_to_text.realtime.connect(
        RealtimeAudioOptions(
            model_id="scribe_v2_realtime",
            audio_format=AudioFormat.PCM_16000,
            sample_rate=SAMPLE_RATE,
            commit_strategy=CommitStrategy.VAD,
            include_timestamps=True,
            **({"language_code": language} if language else {}),
        )
    )

    def audio_callback(indata, frames, time_info, status):
        if status:
            print(f"Audio status: {status}", file=sys.stderr)
        audio_queue.put_nowait(indata.copy().tobytes())

    def on_session_started(data):
        asyncio.create_task(send_audio())

    def on_partial_transcript(data):
        if show_partials:
            text = data.get("text", "")
            if text:
                if json_output:
                    print(json.dumps({"type": "partial", "text": text}))
                else:
                    print(f"[partial] {text}", end="\r")
                    sys.stdout.flush()

    def on_committed_transcript(data):
        text = data.get("text", "")
        if text:
            if json_output:
                print(json.dumps({"type": "final", "text": text}))
            else:
                # Clear the partial line and print final
                print(f"\r{text}          ")

    def on_error(error):
        print(f"Error: {error}", file=sys.stderr)
        stop_event.set()

    def on_close():
        stop_event.set()

    async def send_audio():
        while not stop_event.is_set():
            try:
                audio_data = await asyncio.wait_for(audio_queue.get(), timeout=0.5)
                chunk_base64 = base64.b64encode(audio_data).decode("utf-8")
                await connection.send({"audio_base_64": chunk_base64, "sample_rate": SAMPLE_RATE})
            except asyncio.TimeoutError:
                continue
            except Exception as e:
                print(f"Send error: {e}", file=sys.stderr)
                break

    connection.on(RealtimeEvents.SESSION_STARTED, on_session_started)
    connection.on(RealtimeEvents.PARTIAL_TRANSCRIPT, on_partial_transcript)
    connection.on(RealtimeEvents.COMMITTED_TRANSCRIPT, on_committed_transcript)
    connection.on(RealtimeEvents.ERROR, on_error)
    connection.on(RealtimeEvents.CLOSE, on_close)

    if not quiet:
        print("Listening... (Ctrl+C to stop)", file=sys.stderr)

    try:
        with sd.InputStream(
            samplerate=SAMPLE_RATE,
            channels=1,
            dtype="int16",
            blocksize=int(SAMPLE_RATE * CHUNK_DURATION),
            callback=audio_callback,
        ):
            await stop_event.wait()
    except KeyboardInterrupt:
        pass
    finally:
        await connection.close()


async def realtime_from_file(
    file_path: str,
    show_partials: bool = False,
    language: str | None = None,
    json_output: bool = False,
) -> None:
    """Realtime transcription from local audio file."""
    from pydub import AudioSegment
    from elevenlabs import AudioFormat, CommitStrategy, RealtimeAudioOptions, RealtimeEvents

    client = get_client()
    transcription_complete = asyncio.Event()

    SAMPLE_RATE = 16000
    CHUNK_SIZE = 32000  # 1 second of audio at 16kHz

    # Load and convert audio to PCM
    def load_audio(path: str) -> bytes:
        audio = AudioSegment.from_file(path)
        if audio.channels > 1:
            audio = audio.set_channels(1)
        if audio.frame_rate != SAMPLE_RATE:
            audio = audio.set_frame_rate(SAMPLE_RATE)
        audio = audio.set_sample_width(2)  # 16-bit
        return audio.raw_data

    audio_data = load_audio(file_path)
    chunks = [audio_data[i : i + CHUNK_SIZE] for i in range(0, len(audio_data), CHUNK_SIZE)]

    connection = await client.speech_to_text.realtime.connect(
        RealtimeAudioOptions(
            model_id="scribe_v2_realtime",
            audio_format=AudioFormat.PCM_16000,
            sample_rate=SAMPLE_RATE,
            commit_strategy=CommitStrategy.MANUAL,
            include_timestamps=True,
            **({"language_code": language} if language else {}),
        )
    )

    def on_session_started(data):
        asyncio.create_task(send_audio())

    def on_partial_transcript(data):
        if show_partials:
            text = data.get("text", "")
            if text:
                if json_output:
                    print(json.dumps({"type": "partial", "text": text}))
                else:
                    print(f"[partial] {text}")

    def on_committed_transcript(data):
        text = data.get("text", "")
        if text:
            if json_output:
                print(json.dumps({"type": "final", "text": text}))
            else:
                print(text)

    def on_committed_transcript_with_timestamps(data):
        transcription_complete.set()

    def on_error(error):
        print(f"Error: {error}", file=sys.stderr)
        transcription_complete.set()

    def on_close():
        transcription_complete.set()

    async def send_audio():
        for i, chunk in enumerate(chunks):
            chunk_base64 = base64.b64encode(chunk).decode("utf-8")
            await connection.send({"audio_base_64": chunk_base64, "sample_rate": SAMPLE_RATE})
            # Simulate real-time streaming pace
            if i < len(chunks) - 1:
                await asyncio.sleep(0.1)
        await asyncio.sleep(0.5)
        await connection.commit()

    connection.on(RealtimeEvents.SESSION_STARTED, on_session_started)
    connection.on(RealtimeEvents.PARTIAL_TRANSCRIPT, on_partial_transcript)
    connection.on(RealtimeEvents.COMMITTED_TRANSCRIPT, on_committed_transcript)
    connection.on(RealtimeEvents.COMMITTED_TRANSCRIPT_WITH_TIMESTAMPS, on_committed_transcript_with_timestamps)
    connection.on(RealtimeEvents.ERROR, on_error)
    connection.on(RealtimeEvents.CLOSE, on_close)

    try:
        await transcription_complete.wait()
    except KeyboardInterrupt:
        pass
    finally:
        await connection.close()


def main():
    parser = argparse.ArgumentParser(
        description="ElevenLabs Speech-to-Text transcription",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  %(prog)s audio.mp3                    Batch transcribe file
  %(prog)s audio.mp3 --diarize          With speaker diarization
  %(prog)s audio.mp3 --realtime         Realtime streaming from file
  %(prog)s --url https://stream.mp3     Realtime from URL
  %(prog)s --mic                        Realtime from microphone
""",
    )

    # Input sources
    parser.add_argument("file", nargs="?", help="Audio file to transcribe")
    parser.add_argument("--url", metavar="URL", help="Stream URL for realtime transcription")
    parser.add_argument("--mic", action="store_true", help="Use microphone for realtime transcription")

    # Mode
    parser.add_argument("--realtime", action="store_true", help="Use realtime streaming for file")

    # Options
    parser.add_argument("--diarize", action="store_true", help="Enable speaker diarization")
    parser.add_argument("--lang", metavar="CODE", help="ISO language code (e.g., en, pt, es)")
    parser.add_argument("--json", action="store_true", help="Output full JSON response")
    parser.add_argument("--events", action="store_true", help="Tag audio events (laughter, music, etc.)")
    parser.add_argument("--partials", action="store_true", help="Show partial transcripts in realtime mode")
    parser.add_argument("--quiet", "-q", action="store_true", help="Suppress status messages on stderr")

    args = parser.parse_args()

    # Validate input
    if not args.file and not args.url and not args.mic:
        parser.error("Must specify a file, --url, or --mic")

    if args.mic and args.file:
        parser.error("Cannot use --mic with a file")

    if args.url and args.file:
        parser.error("Cannot use --url with a file")

    # Execute appropriate mode
    if args.mic:
        asyncio.run(
            realtime_from_mic(
                show_partials=args.partials,
                language=args.lang,
                json_output=args.json,
                quiet=args.quiet,
            )
        )
    elif args.url:
        asyncio.run(
            realtime_from_url(
                url=args.url,
                show_partials=args.partials,
                language=args.lang,
                json_output=args.json,
            )
        )
    elif args.realtime:
        if not args.file:
            parser.error("--realtime requires a file")
        if not Path(args.file).exists():
            print(f"Error: File not found: {args.file}", file=sys.stderr)
            sys.exit(1)
        asyncio.run(
            realtime_from_file(
                file_path=args.file,
                show_partials=args.partials,
                language=args.lang,
                json_output=args.json,
            )
        )
    else:
        # Batch mode
        if not args.file:
            parser.error("Must specify a file for batch transcription")
        if not Path(args.file).exists():
            print(f"Error: File not found: {args.file}", file=sys.stderr)
            sys.exit(1)
        batch_transcribe(
            file_path=args.file,
            diarize=args.diarize,
            language=args.lang,
            tag_events=args.events,
            json_output=args.json,
        )


if __name__ == "__main__":
    main()

const fs = require('fs');
const path = require('path');
const { exec, spawn } = require('child_process');
const util = require('util');

const execAsync = util.promisify(exec);

class ImprovedVoiceSkill {
  constructor() {
    this.name = 'voice';
    this.description = 'Enhanced text-to-speech functionality using edge-tts with direct playback';
    this.dependencies = ['edge-tts'];
  }

  /**
   * Converts text to speech using edge-tts and optionally plays it directly
   * @param {string} text - The text to convert to speech
   * @param {Object} options - Options for the TTS
   * @param {boolean} playImmediately - Whether to play the audio immediately after generation
   * @returns {Promise<Object>} Result object with success status, message and media link
   */
  async textToSpeech(text, options = {}, playImmediately = false) {
    // Set default options
    const {
      voice = 'zh-CN-XiaoxiaoNeural',  // Default to Chinese voice
      output = null,
      rate = '+0%',
      volume = '+0%',
      pitch = '+0Hz'
    } = options;

    // Validate input
    if (!text || typeof text !== 'string') {
      throw new Error('Text is required and must be a string');
    }

    // Create a temporary file for the output
    const tempDir = path.join(__dirname, '..', '..', 'temp');
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }

    const outputFileName = output || path.join(tempDir, `tts_${Date.now()}.mp3`);
    
    // Build the edge-tts command
    const cmd = [
      'edge-tts',
      '--text', `"${text.replace(/"/g, '\\"')}"`,
      '--write-media', outputFileName,
      '--voice', voice,
      '--rate', rate,
      '--volume', volume,
      '--pitch', pitch
    ].join(' ');

    try {
      // Execute the edge-tts command
      await execAsync(cmd);
      
      // Verify the file was created
      if (!fs.existsSync(outputFileName)) {
        throw new Error(`Failed to create audio file at ${outputFileName}`);
      }

      // Play immediately if requested
      let playResult = null;
      if (playImmediately) {
        playResult = await this.playAudio(outputFileName);
      }

      return {
        success: true,
        message: `Text-to-speech completed successfully${playImmediately ? ' and played' : ''}`,
        media: `MEDIA: ${outputFileName}`,
        filePath: outputFileName,
        played: playImmediately,
        playResult: playResult
      };
    } catch (error) {
      throw new Error(`Text-to-speech failed: ${error.message}`);
    }
  }

  /**
   * Plays an audio file directly using system player
   * @param {string} filePath - Path to the audio file to play
   * @returns {Promise<Object>} Play result
   */
  async playAudio(filePath) {
    return new Promise((resolve, reject) => {
      if (!fs.existsSync(filePath)) {
        reject(new Error(`Audio file does not exist: ${filePath}`));
        return;
      }

      // Determine the appropriate player based on OS
      let player;
      let playerArgs;

      if (process.platform === 'darwin') { // macOS
        player = 'afplay';
        playerArgs = [filePath];
      } else if (process.platform === 'win32') { // Windows
        player = 'powershell';
        playerArgs = ['-c', `(New-Object Media.SoundPlayer "${filePath}").PlaySync();`];
      } else { // Linux and others
        player = 'aplay';
        playerArgs = [filePath];
      }

      const playProcess = spawn(player, playerArgs);

      playProcess.on('close', (code) => {
        if (code === 0) {
          resolve({ success: true, message: `Audio played successfully` });
        } else {
          reject(new Error(`Audio playback failed with code: ${code}`));
        }
      });

      playProcess.on('error', (err) => {
        reject(new Error(`Audio playback error: ${err.message}`));
      });
    });
  }

  /**
   * Cleans up temporary audio files older than specified time
   * @param {number} hoursOld - Files older than this many hours will be cleaned up
   * @returns {Promise<number>} Number of files removed
   */
  async cleanupTempFiles(hoursOld = 1) { // Reduce default cleanup time to 1 hour
    const tempDir = path.join(__dirname, '..', '..', 'temp');
    if (!fs.existsSync(tempDir)) {
      return 0;
    }

    const cutoffTime = Date.now() - (hoursOld * 60 * 60 * 1000);
    const files = fs.readdirSync(tempDir);
    let removedCount = 0;

    for (const file of files) {
      const filePath = path.join(tempDir, file);
      const stat = fs.statSync(filePath);
      
      if (stat.isFile() && file.match(/\.(mp3|wav|ogg)$/) && stat.mtime.getTime() < cutoffTime) {
        try {
          fs.unlinkSync(filePath);
          removedCount++;
        } catch (err) {
          console.warn(`Could not remove file ${filePath}: ${err.message}`);
        }
      }
    }

    return removedCount;
  }

  /**
   * Speaks text directly without saving to file
   * @param {string} text - The text to speak
   * @param {Object} options - Options for the TTS
   * @returns {Promise<Object>} Result object
   */
  async speakDirect(text, options = {}) {
    // For direct speaking, we'll create a temporary file and play it immediately
    const result = await this.textToSpeech(text, options, true);
    
    // Schedule cleanup of the temp file after a short time
    setTimeout(() => {
      if (fs.existsSync(result.filePath)) {
        fs.unlink(result.filePath, (err) => {
          if (err) console.error(`Error removing temp file: ${err.message}`);
        });
      }
    }, 5000); // Clean up after 5 seconds
    
    return result;
  }

  /**
   * Installs the required dependencies
   * @returns {Promise<void>}
   */
  async installDependencies() {
    try {
      await execAsync('pip3 install edge-tts');
      console.log('Successfully installed edge-tts');
    } catch (error) {
      console.error('Failed to install edge-tts:', error.message);
      throw error;
    }
  }

  /**
   * Main execution function for the skill
   * @param {Object} params - Parameters for the skill
   * @returns {Promise<Object>} Result of the operation
   */
  async execute(params) {
    const { action, text, options, playImmediately = false } = params;

    switch (action) {
      case 'tts':
        if (!text) {
          throw new Error('Text is required for text-to-speech');
        }
        
        const result = await this.textToSpeech(text, options, playImmediately);
        return result;

      case 'speak':
        if (!text) {
          throw new Error('Text is required for speaking');
        }
        
        const speakResult = await this.speakDirect(text, options);
        return speakResult;

      case 'play':
        if (!params.filePath) {
          throw new Error('File path is required for playing audio');
        }
        
        const playResult = await this.playAudio(params.filePath);
        return {
          success: true,
          message: 'Audio played successfully',
          playResult
        };

      case 'cleanup':
        const hoursOld = options?.hoursOld || 1; // Default to 1 hour
        const cleaned = await this.cleanupTempFiles(hoursOld);
        return {
          success: true,
          message: `Cleaned up ${cleaned} temporary audio files`
        };

      case 'install':
        await this.installDependencies();
        return {
          success: true,
          message: 'Dependencies installed successfully'
        };

      case 'voices':
        // Return a list of available voices
        return {
          success: true,
          message: 'Available voices',
          voices: [
            'zh-CN-XiaoxiaoNeural', 'zh-CN-YunxiNeural', 'zh-CN-YunyangNeural',
            'en-US-Standard-C', 'en-US-Standard-D', 'en-US-Wavenet-F',
            'ja-JP-NanamiNeural', 'ko-KR-SunHiNeural'
          ]
        };

      default:
        throw new Error(`Unknown action: ${action}. Available actions: tts, speak, play, cleanup, install, voices`);
    }
  }
}

module.exports = ImprovedVoiceSkill;
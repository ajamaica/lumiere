package main

import (
	"crypto/ed25519"
	"encoding/binary"
	"fmt"
	"io"
	"log"
	"net"
	"os"
	"os/signal"
	"sync"
	"syscall"
	"time"

	"google.golang.org/protobuf/proto"
)

const MaxPacketSize = 65536

var (
	agents  = make(map[string]net.Conn) // "bot:weather" -> conn
	connSrc = make(map[net.Conn]string) // conn -> "bot:weather" (reverse)
	routeMu sync.RWMutex
)

// registerConn registers a connection under the given agent identity.
// Last-write-wins: if the identity is already registered, the old connection is closed.
func registerConn(identity string, conn net.Conn) {
	routeMu.Lock()
	defer routeMu.Unlock()

	if old, exists := agents[identity]; exists && old != conn {
		log.Printf("Identity %q re-registered, closing old connection", identity)
		// Clean up reverse map for old connection
		delete(connSrc, old)
		old.Close()
	}
	agents[identity] = conn
	connSrc[conn] = identity
}

// unregisterConn removes a connection from the routing table.
func unregisterConn(conn net.Conn) {
	routeMu.Lock()
	defer routeMu.Unlock()

	if identity, exists := connSrc[conn]; exists {
		delete(agents, identity)
		delete(connSrc, conn)
		log.Printf("Unregistered %q", identity)
	}
}

// readPacket reads a length-prefixed protobuf Packet from conn.
// Wire format: [4 bytes big-endian uint32 length][length bytes protobuf].
func readPacket(conn net.Conn) (*Packet, error) {
	var lenBuf [4]byte
	if _, err := io.ReadFull(conn, lenBuf[:]); err != nil {
		return nil, err
	}
	msgLen := binary.BigEndian.Uint32(lenBuf[:])

	if msgLen == 0 {
		return nil, fmt.Errorf("zero-length packet")
	}
	if msgLen > MaxPacketSize {
		return nil, fmt.Errorf("packet too large: %d > %d", msgLen, MaxPacketSize)
	}

	payload := make([]byte, msgLen)
	if _, err := io.ReadFull(conn, payload); err != nil {
		return nil, err
	}

	var p Packet
	if err := proto.Unmarshal(payload, &p); err != nil {
		return nil, fmt.Errorf("unmarshal: %w", err)
	}
	return &p, nil
}

// writePacket serializes a Packet with a 4-byte big-endian length prefix and writes it to conn.
func writePacket(conn net.Conn, p *Packet) error {
	data, err := proto.Marshal(p)
	if err != nil {
		return fmt.Errorf("marshal: %w", err)
	}
	if len(data) > MaxPacketSize {
		return fmt.Errorf("packet too large: %d > %d", len(data), MaxPacketSize)
	}

	var lenBuf [4]byte
	binary.BigEndian.PutUint32(lenBuf[:], uint32(len(data)))

	if _, err := conn.Write(lenBuf[:]); err != nil {
		return err
	}
	if _, err := conn.Write(data); err != nil {
		return err
	}
	return nil
}

func heartbeat() {
	ticker := time.NewTicker(60 * time.Second)
	defer ticker.Stop()
	for range ticker.C {
		hb := &Packet{
			Typ: 2,
			Src: "server",
		}
		routeMu.Lock()
		for identity, conn := range agents {
			if err := writePacket(conn, hb); err != nil {
				log.Printf("Heartbeat fail %s: %v", identity, err)
				delete(connSrc, conn)
				delete(agents, identity)
				conn.Close()
			}
		}
		routeMu.Unlock()
	}
}

// verifySig checks the ed25519 signature on a Packet.
// The signed payload is the Packet with sig and pk zeroed out, then serialized.
func verifySig(p *Packet) bool {
	if len(p.Sig) == 0 || len(p.Pk) == 0 {
		return false // unsigned packet
	}
	if len(p.Pk) != ed25519.PublicKeySize {
		log.Printf("Malformed pk: expected %d bytes, got %d", ed25519.PublicKeySize, len(p.Pk))
		return false
	}
	if len(p.Sig) != ed25519.SignatureSize {
		log.Printf("Malformed sig: expected %d bytes, got %d", ed25519.SignatureSize, len(p.Sig))
		return false
	}

	// Reconstruct the exact bytes that were signed:
	// a copy of the packet with sig and pk cleared.
	signCopy := &Packet{
		Typ:  p.Typ,
		Id:   p.Id,
		Src:  p.Src,
		Dst:  p.Dst,
		Body: p.Body,
		Fee:  p.Fee,
		Ttl:  p.Ttl,
		Scar: p.Scar,
		// Sig and Pk intentionally omitted (zero value)
	}
	signBytes, err := proto.Marshal(signCopy)
	if err != nil {
		log.Printf("Marshal for verify failed: %v", err)
		return false
	}

	return ed25519.Verify(p.Pk, signBytes, p.Sig)
}

func handleConnection(c net.Conn) {
	defer c.Close()
	addr := c.RemoteAddr().String()
	defer unregisterConn(c)

	for {
		p, err := readPacket(c)
		if err != nil {
			if err != io.EOF {
				log.Printf("Read error from %s: %v", addr, err)
			}
			return
		}

		// Signature is REQUIRED — unsigned packets are logged and dropped
		if len(p.Sig) == 0 && len(p.Pk) == 0 {
			log.Printf("DROPPED unsigned packet from %s (src=%s body=%q)", addr, p.Src, p.Body)
			continue
		}

		if !verifySig(p) {
			log.Printf("DROPPED invalid sig from %s (src=%s)", addr, p.Src)
			continue
		}

		// Register agent identity from first valid packet's src field
		if p.Src != "" {
			registerConn(p.Src, c)
		}

		log.Printf("From %s (typ %d): %s -> %s", p.Src, p.Typ, p.Body, p.Dst)

		// Route based on dst field
		switch {
		case p.Dst == "server" || p.Dst == "":
			// Backward compatible: reply "done"
			resp := &Packet{
				Id:   p.Id,
				Typ:  1,
				Src:  "server",
				Body: "done",
			}
			if err := writePacket(c, resp); err != nil {
				log.Printf("Write error to %s: %v", addr, err)
				return
			}

		default:
			// Forward to registered agent
			routeMu.RLock()
			target, exists := agents[p.Dst]
			routeMu.RUnlock()

			if !exists {
				resp := &Packet{
					Id:   p.Id,
					Typ:  1,
					Src:  "server",
					Body: "error:offline",
				}
				if err := writePacket(c, resp); err != nil {
					log.Printf("Write error to %s: %v", addr, err)
					return
				}
				log.Printf("Route %s -> %s: offline", p.Src, p.Dst)
				continue
			}

			// Forward original signed packet (preserving signature)
			if err := writePacket(target, p); err != nil {
				resp := &Packet{
					Id:   p.Id,
					Typ:  1,
					Src:  "server",
					Body: "error:delivery_failed",
				}
				if writeErr := writePacket(c, resp); writeErr != nil {
					log.Printf("Write error to %s: %v", addr, writeErr)
					return
				}
				log.Printf("Route %s -> %s: delivery failed: %v", p.Src, p.Dst, err)
				continue
			}
			log.Printf("Routed %s -> %s", p.Src, p.Dst)
		}
	}
}

func main() {
	l, err := net.Listen("tcp", ":9009")
	if err != nil {
		log.Fatal(err)
	}
	log.Println("keep listening on :9009")

	go heartbeat()

	sig := make(chan os.Signal, 1)
	signal.Notify(sig, syscall.SIGINT, syscall.SIGTERM)
	go func() {
		<-sig
		log.Println("Shutdown")
		os.Exit(0)
	}()

	for {
		conn, err := l.Accept()
		if err != nil {
			continue
		}
		go handleConnection(conn)
	}
}

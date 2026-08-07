package main

import (
	"bytes"
	"compress/gzip"
	"context"
	"encoding/base64"
	"encoding/binary"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os"
	"strconv"
	"strings"
	"sync"
	"time"

	"github.com/redis/go-redis/v9"
)

var rdb *redis.Client
var ctx = context.Background()

func initRedis() {
	redisPass := os.Getenv("REDIS_PASS")
	redisHost := os.Getenv("REDIS_HOST")
	if redisHost == "" {
		redisHost = "redis:6379"
	}
	if !strings.Contains(redisHost, ":") {
		redisHost += ":6379"
	}
	rdb = redis.NewClient(&redis.Options{
		Addr:     redisHost,
		Password: redisPass,
		DB:       0,
	})
	
	if err := rdb.Ping(ctx).Err(); err != nil {
		log.Fatalf("Error connecting to Redis: %v", err)
	}
	log.Println("Connected to Redis")
}

type ChunkRequest struct {
	CanvasID int      `json:"canvas_id"`
	BoardW   int      `json:"board_w"`
	BoardH   int      `json:"board_h"`
	Chunks   []string `json:"chunks"`
}

type ChunkResponse struct {
	Success bool `json:"success"`
	Data    struct {
		CanvasID  int               `json:"canvas_id"`
		ChunkSize int               `json:"chunk_size"`
		Chunks    map[string]string `json:"chunks"`
	} `json:"data"`
}

var extractChunksLua = redis.NewScript(`
local redisKey = KEYS[1]
local boardW = tonumber(ARGV[1])
local boardH = tonumber(ARGV[2])
local chunkSize = tonumber(ARGV[3])
local res = {}

for i = 4, #ARGV do
    local chunkKey = ARGV[i]
    local comma = string.find(chunkKey, ",")
    if comma then
        local cx = tonumber(string.sub(chunkKey, 1, comma - 1))
        local cy = tonumber(string.sub(chunkKey, comma + 1))
        local startX = cx * chunkSize
        local startY = cy * chunkSize
        
        if startX < boardW and startY < boardH and startX >= 0 and startY >= 0 then
            local actualW = math.min(chunkSize, boardW - startX)
            local actualH = math.min(chunkSize, boardH - startY)
            local rowLen = actualW * 4
            local rows = {}
            for y = 0, actualH - 1 do
                local offset = ((startY + y) * boardW + startX) * 4
                local line = redis.call('GETRANGE', redisKey, offset, offset + rowLen - 1)
                rows[#rows + 1] = line
            end
            res[#res + 1] = chunkKey
            res[#res + 1] = table.concat(rows)
        end
    end
end
return res
`)

func getChunksHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var req ChunkRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid JSON", http.StatusBadRequest)
		return
	}

	if req.CanvasID <= 0 || req.BoardW <= 0 || req.BoardH <= 0 || len(req.Chunks) == 0 {
		http.Error(w, "Invalid parameters", http.StatusBadRequest)
		return
	}

	chunkSize := 512
	redisKey := fmt.Sprintf("canvas:%d:state", req.CanvasID)

	response := ChunkResponse{Success: true}
	response.Data.CanvasID = req.CanvasID
	response.Data.ChunkSize = chunkSize
	response.Data.Chunks = make(map[string]string)

	exists, _ := rdb.Exists(ctx, redisKey).Result()
	if exists == 0 {
		expectedLen := req.BoardW * req.BoardH * 4
		rdb.Set(ctx, redisKey, make([]byte, expectedLen), 0)
	}

	totalSize := req.BoardW * req.BoardH * 4
	useFullFetch := false
	if totalSize <= 2*1024*1024 {
		useFullFetch = true
	} else if totalSize <= 8*1024*1024 && len(req.Chunks) >= 2 {
		useFullFetch = true
	}

	chunkBuffers := make(map[string][]byte)
	t0 := time.Now()

	if useFullFetch {
		canvasBytes, err := rdb.Get(ctx, redisKey).Bytes()
		if err != nil && err != redis.Nil {
			http.Error(w, "Redis error", http.StatusInternalServerError)
			return
		}
		if err == redis.Nil || len(canvasBytes) == 0 {
			canvasBytes = make([]byte, totalSize)
			rdb.Set(ctx, redisKey, canvasBytes, 0)
		}
		if len(canvasBytes) < totalSize {
			padded := make([]byte, totalSize)
			copy(padded, canvasBytes)
			canvasBytes = padded
		}

		for _, chunkKey := range req.Chunks {
			parts := strings.Split(chunkKey, ",")
			if len(parts) != 2 {
				continue
			}
			cx, err1 := strconv.Atoi(parts[0])
			cy, err2 := strconv.Atoi(parts[1])
			if err1 != nil || err2 != nil {
				continue
			}

			startX := cx * chunkSize
			startY := cy * chunkSize

			if startX >= req.BoardW || startY >= req.BoardH || startX < 0 || startY < 0 {
				continue
			}

			actualW := min(chunkSize, req.BoardW-startX)
			actualH := min(chunkSize, req.BoardH-startY)

			buf := make([]byte, actualW*actualH*4)
			destOffset := 0
			rowLen := actualW * 4

			for y := 0; y < actualH; y++ {
				srcOffset := ((startY+y)*req.BoardW + startX) * 4
				copy(buf[destOffset:destOffset+rowLen], canvasBytes[srcOffset:srcOffset+rowLen])
				destOffset += rowLen
			}
			chunkBuffers[chunkKey] = buf
		}
		log.Printf("In-memory fetch & extraction took %v", time.Since(t0))
	} else {
		// Use native Redis Lua script to extract chunks efficiently
		args := make([]interface{}, 0, 3+len(req.Chunks))
		args = append(args, req.BoardW, req.BoardH, chunkSize)
		for _, chunkKey := range req.Chunks {
			args = append(args, chunkKey)
		}

		res, err := extractChunksLua.Run(ctx, rdb, []string{redisKey}, args...).Result()
		if err != nil && err != redis.Nil {
			http.Error(w, "Redis Lua error: "+err.Error(), http.StatusInternalServerError)
			return
		}
		log.Printf("Redis Lua execution took %v", time.Since(t0))

		luaResult, ok := res.([]interface{})
		if ok {
			for i := 0; i < len(luaResult); i += 2 {
				cKey, okKey := luaResult[i].(string)
				cBufStr, okBuf := luaResult[i+1].(string)
				if okKey && okBuf {
					chunkBuffers[cKey] = []byte(cBufStr)
				}
			}
		}
	}

	// Concurrently compress
	var wg sync.WaitGroup
	var mu sync.Mutex

	chunkCompressed := make(map[string][]byte)

	for key, buffer := range chunkBuffers {
		wg.Add(1)
		go func(k string, buf []byte) {
			defer wg.Done()

			var b bytes.Buffer
			gw, _ := gzip.NewWriterLevel(&b, gzip.BestSpeed)
			gw.Write(buf)
			gw.Close()

			mu.Lock()
			chunkCompressed[k] = b.Bytes()
			mu.Unlock()
		}(key, buffer)
	}

	wg.Wait()
	t2 := time.Now()
	log.Printf("Compression took %v", t2.Sub(t0))

	if r.Header.Get("Accept") == "application/octet-stream" {
		w.Header().Set("Content-Type", "application/octet-stream")

		// Binary format:
		// [Total Chunks: 2 bytes (uint16)]
		// For each chunk:
		//   [Key Len: 1 byte (uint8)]
		//   [Key Name: string bytes]
		//   [Compressed Size: 4 bytes (uint32)]
		//   [Compressed Bytes: N bytes]
		numChunks := uint16(len(chunkCompressed))
		binary.Write(w, binary.BigEndian, numChunks)

		for k, compBuf := range chunkCompressed {
			keyBytes := []byte(k)
			w.Write([]byte{uint8(len(keyBytes))})
			w.Write(keyBytes)

			binary.Write(w, binary.BigEndian, uint32(len(compBuf)))
			w.Write(compBuf)
		}

		t3 := time.Now()
		log.Printf("Binary response generation took %v", t3.Sub(t2))
		return
	}

	// Fallback to JSON and Base64 (original format)
	for k, compBuf := range chunkCompressed {
		encoded := base64.StdEncoding.EncodeToString(compBuf)
		response.Data.Chunks[k] = encoded
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
	t3 := time.Now()
	log.Printf("JSON encode took %v", t3.Sub(t2))
}

func min(a, b int) int {
	if a < b {
		return a
	}
	return b
}

func main() {
	initRedis()
	http.HandleFunc("/api/go/canvases/get_chunks", getChunksHandler)
	port := "8080"
	log.Printf("Go service listening on port %s", port)
	log.Fatal(http.ListenAndServe(":"+port, nil))
}

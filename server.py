import uvicorn
from argparse import ArgumentParser
from fastapi import FastAPI, Request
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from aiortc import RTCPeerConnection, RTCSessionDescription

# Create FastAPI app
app = FastAPI()
app.mount("/client", StaticFiles(directory="../../client"), name="static")

peer_connections = set()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Read sample image
file = None
with open('../../samples/image/image_small.bin', 'rb') as f:
    file = f.read()

# WebRTC Offer Endpoint
@app.post('/offer')
async def offer(request: Request):    
    params = await request.json()
    print(params)
    
    offer = RTCSessionDescription(sdp=params["sdp"], type=params["type"])
    pc = RTCPeerConnection()
    peer_connections.add(pc)

    # On message received, send file
    @pc.on("datachannel")
    def on_datachannel(channel):
        print("Data channel created")
        @channel.on("message")
        def on_message(message):
            channel.send(file)

    # On state change
    @pc.on("connectionstatechange")
    async def on_connectionstatechange():
        print(f"Connection state changed to: {pc.connectionState}")
        if pc.connectionState == "failed":
            await pc.close()
            peer_connections.discard(pc)

    # Setup socket endpoints
    await pc.setRemoteDescription(offer)
    answer = await pc.createAnswer()
    await pc.setLocalDescription(answer)

    # Send answer
    return {"sdp": pc.localDescription.sdp, "type": pc.localDescription.type}


if __name__ == "__main__":
    # Read args
    argp = ArgumentParser(description="WebRTC DataChannel Demo")
    argp.add_argument("--host", type=str, default="0.0.0.0", help="Host IP for HTTP server (default: 0.0.0.0)")
    argp.add_argument("--port", type=int, default=8080, help="Port for HTTP server (default: 8080)")
    argp.add_argument("--silent", type=bool, default=False, help="Supress console logs to increase performance (default: False)")
    args = argp.parse_args()
    
    # Set log level
    log_level = 'critical' if args.silent else 'info'

    # Start server
    uvicorn.run(app, host="0.0.0.0", port=args.port, log_level=log_level)
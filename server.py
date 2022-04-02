from fastapi import FastAPI, Request
from fastapi.staticfiles import StaticFiles
from aiortc import RTCPeerConnection, RTCSessionDescription

# Create FastAPI app
app = FastAPI()
app.mount("/client", StaticFiles(directory="../../client"), name="static")

peer_connections = set()

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


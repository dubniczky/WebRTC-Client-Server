// Constants
const host = window.location.origin
const apiport = 8080
const offerEndpoint = 'offer'
const sdpSemantics = 'unified-plan'
const dcBinType = 'arraybuffer'
const stunServers = [
    "stun1.l.google.com:19302",
]

// Components
let generalState = null
let dataChannelOrdering = null
let dataChannelRetransmission = null
let dataChannelLifetime = null
let dataChannelLog = null
let iceConnectionLog = null
let iceGatheringLog = null
let signalingLog = null
let useStunCheck = null
let sdpOfferBox =null
let sdpAnswerBox = null
let startButton = null
let stopButton = null
let dcoptions = null

// Connection variables
let pc = null
let dc = null
let dcInterval = null
let measurements = []
let packetTime = 0

async function loadComponents() {
    dataChannelOrdering = document.getElementById('datachannel-ordering')
    dataChannelRetransmission = document.getElementById('datachannel-retransmission')
    dataChannelLifetime = document.getElementById('datachannel-lifetime')
    dataChannelLog = document.getElementById('data-channel-state')
    iceConnectionLog = document.getElementById('ice-connection-state')
    iceGatheringLog = document.getElementById('ice-gathering-state')
    signalingLog = document.getElementById('signaling-state')
    useStunCheck = document.getElementById('use-stun')
    sdpOfferBox = document.getElementById('offer-sdp')
    sdpAnswerBox = document.getElementById('answer-sdp')
    startButton = document.getElementById('start-button')
    stopButton = document.getElementById('stop-button')
    dcoptions = document.getElementById('dc-options')
    generalState = document.getElementById('general-state')

    generalState.textContent = "Ready."
}

function setupPeerConnection() {
    // Configure connection
    var config = {
        sdpSemantics: sdpSemantics
    }
    if (useStunCheck.checked) {
        config.iceServers = [ { urls: stunServers } ]
    }
    pc = new RTCPeerConnection(config)

    // Add state change listeners
    pc.addEventListener('icegatheringstatechange', function() {
        iceGatheringLog.textContent += ' -> ' + pc.iceGatheringState
    }, false)
    iceGatheringLog.textContent = pc.iceGatheringState

    pc.addEventListener('iceconnectionstatechange', function() {
        iceConnectionLog.textContent += ' -> ' + pc.iceConnectionState
    }, false)
    iceConnectionLog.textContent = pc.iceConnectionState

    pc.addEventListener('signalingstatechange', function() {
        signalingLog.textContent += ' -> ' + pc.signalingState
    }, false)
    signalingLog.textContent = pc.signalingState

    return pc
}

function getDCParams() {
    // Ordering On
    if (dataChannelOrdering.value == 'ordered') {
        return { ordered: true }
    }

    // Ordering Off
    return {
        ordered: false,
        maxPacketLifetime: parseInt( dataChannelLifetime.value ),
        maxRetransmits: parseInt( dataChannelRetransmission.value )
    }
}

async function negotiate() {
    // Create offer
    let offer = await pc.createOffer()
    await pc.setLocalDescription(offer)

    // Wait for ICE gathering
    await new Promise(function(resolve) {
        if (pc.iceGatheringState === 'complete') {
            resolve()
        }
        else {
            function checkState() {
                if (pc.iceGatheringState === 'complete') {
                    pc.removeEventListener('icegatheringstatechange', checkState)
                    resolve()
                }
            }
            pc.addEventListener('icegatheringstatechange', checkState)
        }
    })

    // Send offer
    let clientOffer = pc.localDescription
    sdpOfferBox.textContent = clientOffer.sdp
    let result = await fetch(`${host}:${apiport}/${offerEndpoint}`, {
        body: JSON.stringify({
            sdp: clientOffer.sdp,
            type: clientOffer.type,
        }),
        headers: {
            'Content-Type': 'application/json'
        },
        method: 'POST'
    })

    // Save
    let answer = await result.json()
    sdpAnswerBox.textContent = answer.sdp
    await pc.setRemoteDescription(answer)
}

async function start() {
    generalState.textContent = 'Connecting...'
    let startTime = performance.now()
    startButton.disabled = true
    stopButton.disabled = false

    // Create peer connection
    pc = setupPeerConnection()
    
    // Create data channel
    var parameters = getDCParams()
    dcoptions.textContent = JSON.stringify(parameters, null, 3)
    dc = pc.createDataChannel('chat', parameters)
    dataChannelLog.textContent += 'preparing'
    dc.binaryType = dcBinType

    // Add data channel events    
    dc.onopen = () => {
        dataChannelLog.textContent += ' -> open'
        dcInterval = setInterval(() => {
            dc.send(new Uint8Array([ 1 ])) //Sent a 1 byte to trigger package send
            packetTime = performance.now()
        }, 100)
    }

    dc.onmessage = function(event) {
        let bin = new Uint8Array(event.data)
        let t = performance.now() - packetTime
        console.log(`t: ${t}, c: ${measurements.length}, s: ${bin.length}`)
        measurements.push(t) //Record measurement
    }

    dc.onclose = () => {
        clearInterval(dcInterval)
        dataChannelLog.textContent += ' -> closed'
    }

    await negotiate()

    // Calculate performance
    let endTime = performance.now()
    let deltaTime = endTime - startTime
    console.log(`Negotiation finished in: ${(deltaTime/1000).toFixed(3)}s`)
    generalState.textContent = 'Active Connection.'
}

function stop() {
    startButton.disabled = false
    stopButton.disabled = true

    // Close DataChannel
    dc.close()

    // Close transceivers
    if (pc.getTransceivers) {
        pc.getTransceivers().forEach(function(transceiver) {
            if (transceiver.stop) {
                transceiver.stop()
            }
        })
    }

    // Close PeerConnection
    pc.close()

    generalState.textContent = 'Disconnected.'
}

loadComponents()
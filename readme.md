# WebRTC Client-Server DataChannel

An implementation of binary communication between a browser and server using WebRTC DataChannel.

## Introduction

This project is about testing WebRTC DataChannel API in terms of latency for usage between client and server communication. One possible usage for the project was testing real-time communication speed and latency. WebRTC gives some advantages over traditionally used WebSockets, for example the ability to ignore package ordering and retransmission. These features are most of the time not useful, and many times even detremental to real-time performance.

## Requirements

Please note that the programs might work with earlier versions of these software, but they haven't been tested.

- Python 3.10+
- Pip 22.0+
- Node 14+
- Yarn 1.22+

Additional packages are required, but they will be installed automatically from `/package.json` and `/requirements.txt`
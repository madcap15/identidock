var socket = io();

        var localVideo = document.getElementById('local-video');
        var remoteVideo = document.getElementById('remote-video');
        var room = null;
        var pc = null;

        function startCall() {
            room = document.getElementById('room-input').value;
            socket.emit('join_room', room);
            navigator.mediaDevices.getUserMedia({ video: true, audio: true })
                .then(function(stream) {
                    localVideo.srcObject = stream;
                    pc = new RTCPeerConnection();
                    stream.getTracks().forEach(function(track) {
                        pc.addTrack(track, stream);
                    });
                    pc.ontrack = function(event) {
                        remoteVideo.srcObject = event.streams[0];
                    };
                    pc.onicecandidate = function(event) {
                        if (event.candidate) {
                            socket.emit('ice_candidate', { room: room, candidate: event.candidate });
                        }
                    };
                    pc.createOffer()
                        .then(function(offer) {
                            return pc.setLocalDescription(offer);
                        })
                        .then(function() {
                            socket.emit('offer', { room: room, offer: pc.localDescription });
                        });
                })
                .catch(function(error) {
                    console.error('Error accessing media devices: ', error);
                });
        }

        function handleOffer(offer) {
            pc = new RTCPeerConnection();
            pc.ontrack = function(event) {
                remoteVideo.srcObject = event.streams[0];
            };
            pc.onicecandidate = function(event) {
                if (event.candidate) {
                    socket.emit('ice_candidate', { room: room, candidate: event.candidate });
                }
            };
            pc.setRemoteDescription(offer)
                .then(function() {
                    return navigator.mediaDevices.getUserMedia({ video: true, audio: true });
                })
                .then(function(stream) {
                    localVideo.srcObject = stream;
                    stream.getTracks().forEach(function(track) {
                        pc.addTrack(track, stream);
                    });
                    return pc.createAnswer();
                })
                .then(function(answer) {
                    return pc.setLocalDescription(answer);
                })
                .then(function() {
                    socket.emit('answer', { room: room, answer: pc.localDescription });
                })
                .catch(function(error) {
                    console.error('Error handling offer: ', error);
                });
        }

        function handleAnswer(answer) {
            pc.setRemoteDescription(answer)
                .catch(function(error) {
                    console.error('Error handling answer: ', error);
                });
        }

        function handleIceCandidate(candidate) {
            pc.addIceCandidate(candidate)
                .catch(function(error) {
                    console.error('Error handling ICE candidate: ', error);
                });
        }

        function provideControl() {
            var selectedParticipant = document.getElementById('participants-select').value;
            var event = { type: 'provide_control', participant: selectedParticipant };
            socket.emit('desktop_event', { room: room, event: event });
        }

        socket.on('room_joined', function(room) {
            console.log('Joined room: ', room);
        });

        socket.on('offer', function(offer) {
            handleOffer(offer);
        });

       ```html
        socket.on('answer', function(answer) {
            handleAnswer(answer);
        });

        socket.on('ice_candidate', function(candidate) {
            handleIceCandidate(candidate);
        });

        socket.on('desktop_event', function(event) {
            // Обработка событий управления рабочим столом от других клиентов
            if (event.type === 'provide_control') {
                var participant = event.participant;
                console.log('Control provided to participant: ', participant);
            }
        });
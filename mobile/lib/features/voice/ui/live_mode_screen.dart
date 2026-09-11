import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_webrtc/flutter_webrtc.dart';
import 'package:http/http.dart' as http;
import '../../../core/api/rowan_api_client.dart';
import '../../../core/widgets/rowan_avatar.dart';
import '../../auth/providers/auth_provider.dart';

enum VoiceState {
  idle,
  listening,
  thinking,
  processing,
  speaking,
  interrupted,
  reconnecting,
  error
}

class LiveModeScreen extends ConsumerStatefulWidget {
  const LiveModeScreen({super.key});

  @override
  ConsumerState<LiveModeScreen> createState() => _LiveModeScreenState();
}

class _LiveModeScreenState extends ConsumerState<LiveModeScreen> {
  VoiceState _currentState = VoiceState.idle;
  String? _errorMessage;
  RTCPeerConnection? _peerConnection;
  MediaStream? _localStream;
  MediaStream? _remoteStream;
  RTCDataChannel? _dataChannel;
  bool _isMuted = false;

  @override
  void initState() {
    super.initState();
    _startVoiceSession();
  }

  @override
  void dispose() {
    _cleanupSession();
    super.dispose();
  }

  Future<void> _cleanupSession() async {
    _localStream?.getTracks().forEach((track) => track.stop());
    await _localStream?.dispose();
    await _remoteStream?.dispose();
    await _dataChannel?.close();
    await _peerConnection?.close();
    _peerConnection = null;
    _dataChannel = null;
  }

  void _setupDataChannelListeners() {
    if (_dataChannel == null) return;

    _dataChannel!.onDataChannelState = (RTCDataChannelState state) {
      print('[DataChannel] state: $state');
      if (state == RTCDataChannelState.RTCDataChannelStateOpen) {
        _sendSessionUpdate();
      }
    };

    _dataChannel!.onMessage = (RTCDataChannelMessage message) {
      if (message.isBinary) return;
      final text = message.text;
      try {
        final event = jsonDecode(text);
        final String? type = event['type'];
        if (type != null) {
          _handleDataChannelEvent(type, event);
        }
      } catch (e) {
        print('Error parsing data channel message: $e');
      }
    };
  }

  void _sendSessionUpdate() {
    if (_dataChannel == null) return;

    final sessionUpdate = {
      'type': 'session.update',
      'session': {
        'type': 'realtime',
        'instructions': 'You are Rowan, an advanced, highly capable, empathetic AI voice companion. Speak warmly, helpfully, and with confidence.',
        'voice': 'nova', // Premium female voice profile
        'audio': {
          'input': {
            'transcription': { 'model': 'whisper-1' },
            'turn_detection': {
              'type': 'server_vad',
              'threshold': 0.5,
              'prefix_padding_ms': 300,
              'silence_duration_ms': 500
            }
          },
          'output': {
            'voice': 'nova' // Premium female voice profile
          }
        }
      }
    };

    try {
      _dataChannel!.send(RTCDataChannelMessage(jsonEncode(sessionUpdate)));
      print('[DataChannel] Sent session.update with female voice profile (nova)');
    } catch (e) {
      print('Failed to send session update: $e');
    }
  }

  void _handleDataChannelEvent(String type, Map<String, dynamic> event) {
    switch (type) {
      case 'input_audio_buffer.speech_started':
        print('[DIAGNOSTIC] SPEECH_STARTED');
        if (mounted) {
          setState(() {
            _currentState = VoiceState.listening;
          });
        }
        break;

      case 'input_audio_buffer.speech_stopped':
        print('[DIAGNOSTIC] SPEECH_STOPPED');
        if (mounted) {
          setState(() {
            _currentState = VoiceState.thinking;
          });
        }
        break;

      case 'response.created':
        print('[DIAGNOSTIC] RESPONSE_CREATED');
        if (mounted) {
          setState(() {
            _currentState = VoiceState.thinking;
          });
        }
        break;

      case 'response.output_item.added':
        print('[DIAGNOSTIC] RESPONSE_AUDIO_RECEIVED');
        break;

      case 'response.audio_transcript.delta':
      case 'response.output_audio_transcript.delta':
        print('[DIAGNOSTIC] RESPONSE_AUDIO_RECEIVED');
        if (mounted && _currentState != VoiceState.speaking) {
          setState(() {
            _currentState = VoiceState.speaking;
          });
          print('[DIAGNOSTIC] REMOTE_AUDIO_PLAYING');
        }
        break;

      case 'response.done':
        print('[DIAGNOSTIC] RESPONSE_COMPLETED');
        if (mounted) {
          setState(() {
            _currentState = VoiceState.listening;
          });
        }
        break;
    }
  }

  Future<void> _startVoiceSession() async {
    setState(() {
      _currentState = VoiceState.reconnecting;
      _errorMessage = null;
    });

    try {
      final apiClient = ref.read(apiClientProvider);
      
      print('[DIAGNOSTIC] VOICE_SESSION_REQUEST');
      final response = await apiClient.post('/api/voice/session', {});
      final body = jsonDecode(response.body);

      final clientSecret = body['client_secret']?['value'] ?? '';
      final model = body['model'] ?? 'gpt-4o-mini-realtime-preview';

      if (clientSecret.isEmpty) {
        print('[DIAGNOSTIC] VOICE_ERROR: Ephemeral client secret is empty');
        throw Exception('Failed to obtain OpenAI client secret from session.');
      }
      print('[DIAGNOSTIC] VOICE_SESSION_SUCCESS');

      final Map<String, dynamic> rtcConfig = {
        'iceServers': [
          {'urls': 'stun:stun.l.google.com:19302'},
          {'urls': 'stun:stun1.l.google.com:19302'},
        ],
        'sdpSemantics': 'unified-plan',
      };

      _peerConnection = await createPeerConnection(rtcConfig);

      final Map<String, dynamic> mediaConstraints = {
        'audio': {
          'echoCancellation': true,
          'noiseSuppression': true,
          'autoGainControl': true,
        },
        'video': false,
      };
      
      _localStream = await navigator.mediaDevices.getUserMedia(mediaConstraints);
      print('[DIAGNOSTIC] MIC_STARTED');

      _localStream!.getTracks().forEach((track) {
        _peerConnection!.addTrack(track, _localStream!);
        print('[DIAGNOSTIC] LOCAL_AUDIO_TRACK_ADDED: ${track.id}');
      });

      _peerConnection!.onTrack = (RTCTrackEvent event) {
        print('[DIAGNOSTIC] REMOTE_AUDIO_TRACK_RECEIVED');
        if (event.streams.isNotEmpty) {
          setState(() {
            _remoteStream = event.streams[0];
            print('[DIAGNOSTIC] REMOTE_AUDIO_PLAYING');
          });
        }
      };

      _peerConnection!.onConnectionState = (RTCPeerConnectionState state) {
        print('[DIAGNOSTIC] WebRTC Connection State: $state');
        if (state == RTCPeerConnectionState.RTCPeerConnectionStateConnected) {
          print('[DIAGNOSTIC] WEBRTC_CONNECTED');
          if (mounted) {
            setState(() => _currentState = VoiceState.listening);
          }
        } else if (state == RTCPeerConnectionState.RTCPeerConnectionStateFailed) {
          print('[DIAGNOSTIC] VOICE_ERROR: WebRTC Connection Failed');
          if (mounted) {
            setState(() {
              _currentState = VoiceState.error;
              _errorMessage = 'WebRTC PeerConnection failed.';
            });
          }
        }
      };

      RTCDataChannelInit dcInit = RTCDataChannelInit();
      _dataChannel = await _peerConnection!.createDataChannel('oai-events', dcInit);
      _setupDataChannelListeners();

      RTCSessionDescription offer = await _peerConnection!.createOffer({});
      await _peerConnection!.setLocalDescription(offer);

      final sdpUrl = 'https://api.openai.com/v1/realtime/calls?model=$model';
      final sdpResponse = await http.post(
        Uri.parse(sdpUrl),
        headers: {
          'Authorization': 'Bearer $clientSecret',
          'Content-Type': 'application/sdp',
        },
        body: offer.sdp,
      );

      if (sdpResponse.statusCode != 200 && sdpResponse.statusCode != 201) {
        print('[DIAGNOSTIC] VOICE_ERROR: SDP exchange with OpenAI failed with status ${sdpResponse.statusCode}');
        throw Exception('SDP exchange with OpenAI failed: ${sdpResponse.body}');
      }

      final answerSdp = sdpResponse.body;
      await _peerConnection!.setRemoteDescription(
        RTCSessionDescription(answerSdp, 'answer'),
      );
      print('[DIAGNOSTIC] REMOTE_SDP_SET_SUCCESS');

      if (mounted) {
        setState(() => _currentState = VoiceState.listening);
      }
    } catch (e) {
      print('[DIAGNOSTIC] VOICE_ERROR: $e');
      if (mounted) {
        setState(() {
          _currentState = VoiceState.error;
          _errorMessage = e.toString();
        });
      }
    }
  }

  void _toggleMute() {
    if (_localStream != null) {
      final audioTracks = _localStream!.getAudioTracks();
      if (audioTracks.isNotEmpty) {
        final currentMuted = audioTracks[0].enabled;
        audioTracks[0].enabled = !currentMuted;
        setState(() {
          _isMuted = currentMuted;
        });
      }
    }
  }

  RowanAvatarState _mapVoiceToAvatarState(VoiceState state) {
    switch (state) {
      case VoiceState.idle:
        return RowanAvatarState.idle;
      case VoiceState.listening:
        return RowanAvatarState.listening;
      case VoiceState.thinking:
        return RowanAvatarState.thinking;
      case VoiceState.processing:
        return RowanAvatarState.processing;
      case VoiceState.speaking:
        return RowanAvatarState.speaking;
      case VoiceState.interrupted:
        return RowanAvatarState.idle; // map to idle with interruption visual cue
      case VoiceState.reconnecting:
        return RowanAvatarState.processing;
      case VoiceState.error:
        return RowanAvatarState.error;
    }
  }

  String _getStateText(VoiceState state) {
    switch (state) {
      case VoiceState.idle:
        return 'Rowan is Idle';
      case VoiceState.listening:
        return 'Listening to you...';
      case VoiceState.thinking:
        return 'Thinking...';
      case VoiceState.processing:
        return 'Processing audio...';
      case VoiceState.speaking:
        return 'Rowan is Speaking';
      case VoiceState.interrupted:
        return 'Interrupted';
      case VoiceState.reconnecting:
        return 'Establishing Session...';
      case VoiceState.error:
        return 'Connection Failed';
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('ROWAN LIVE VOICE'),
        leading: IconButton(
          icon: const Icon(Icons.arrow_back),
          onPressed: () => Navigator.of(context).pop(),
        ),
      ),
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(24.0),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              const Spacer(),
              // Adaptive Rowan Avatar with Live Audio Pulse
              Center(
                child: RowanExpressiveAvatar(
                  state: _mapVoiceToAvatarState(_currentState),
                  size: 200,
                  audioLevel: _currentState == VoiceState.speaking ? 0.6 : (_currentState == VoiceState.listening ? 0.2 : 0.0),
                ),
              ),
              const SizedBox(height: 40),
              // Interactive State Label
              Text(
                _getStateText(_currentState),
                style: const TextStyle(
                  fontSize: 22,
                  fontWeight: FontWeight.bold,
                  letterSpacing: 0.5,
                ),
                textAlign: TextAlign.center,
              ),
              if (_errorMessage != null) ...[
                const SizedBox(height: 16),
                Text(
                  _errorMessage!,
                  style: const TextStyle(color: Colors.redAccent, fontSize: 14),
                  textAlign: TextAlign.center,
                ),
              ],
              const Spacer(),
              // Control Panel (Mute, Disconnect, Interrupt, etc.)
              Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  // Mute / Unmute Button
                  IconButton(
                    iconSize: 32,
                    onPressed: _currentState == VoiceState.error ? null : _toggleMute,
                    icon: CircleAvatar(
                      radius: 28,
                      backgroundColor: _isMuted ? Colors.redAccent.withOpacity(0.12) : const Color(0xFF1E6091).withOpacity(0.1),
                      child: Icon(
                        _isMuted ? Icons.mic_off : Icons.mic,
                        color: _isMuted ? Colors.redAccent : const Color(0xFF1E6091),
                      ),
                    ),
                  ),
                  const SizedBox(width: 24),
                  // Hangup / Terminate session
                  IconButton(
                    iconSize: 32,
                    onPressed: () => Navigator.of(context).pop(),
                    icon: const CircleAvatar(
                      radius: 36,
                      backgroundColor: Colors.red,
                      child: Icon(Icons.call_end, color: Colors.white, size: 28),
                    ),
                  ),
                  const SizedBox(width: 24),
                  // Refresh / Reconnect Button
                  IconButton(
                    iconSize: 32,
                    onPressed: _startVoiceSession,
                    icon: CircleAvatar(
                      radius: 28,
                      backgroundColor: const Color(0xFF1E6091).withOpacity(0.1),
                      child: const Icon(Icons.refresh, color: Color(0xFF1E6091)),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 48),
            ],
          ),
        ),
      ),
    );
  }
}

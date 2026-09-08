import 'dart:async';
import 'dart:convert';

import 'package:flutter/foundation.dart';
import 'package:flutter_webrtc/flutter_webrtc.dart';
import 'package:http/http.dart' as http;
import 'package:permission_handler/permission_handler.dart';

import '../../core/api/api_client.dart';

class VoiceRealtimeService {
  VoiceRealtimeService({required this.api, void Function(String message)? onLog}) : _onLog = onLog;

  final RowanApiClient api;
  final void Function(String message)? _onLog;
  final RTCVideoRenderer remoteRenderer = RTCVideoRenderer();
  RTCPeerConnection? _peerConnection;
  MediaStream? _localStream;
  RTCDataChannel? _events;
  bool _started = false;

  bool get microphoneEnabled => _localStream?.getAudioTracks().any((track) => track.enabled) ?? false;
  bool get started => _started;

  Future<void> start() async {
    if (_started) return;
    await remoteRenderer.initialize();
    _log('VOICE: requesting microphone permission');
    final permission = await Permission.microphone.request();
    if (!permission.isGranted) {
      throw const ApiException('Microphone permission was not granted.');
    }

    _log('VOICE: microphone started');
    _log('VOICE: requesting session');
    final session = await api.createVoiceSession();
    final credentials = _VoiceSessionCredentials.fromResponse(session);
    _log('VOICE: session received');

    await Helper.setSpeakerphoneOn(true);
    _peerConnection = await createPeerConnection({
      'sdpSemantics': 'unified-plan',
      'iceServers': credentials.iceServers,
    });
    _log('VOICE: realtime connection created');

    _peerConnection!.onConnectionState = (state) => _log('VOICE: connection state $state');
    _peerConnection!.onIceConnectionState = (state) => _log('VOICE: ICE state $state');
    _peerConnection!.onTrack = (event) {
      if (event.track.kind != 'audio') return;
      _log('VOICE: remote audio track received');
      event.track.enabled = true;
      if (event.streams.isNotEmpty) {
        remoteRenderer.srcObject = event.streams.first;
        _log('VOICE: remote audio playing');
      }
    };
    _peerConnection!.onDataChannel = _handleDataChannel;

    _localStream = await navigator.mediaDevices.getUserMedia({'audio': true, 'video': false});
    for (final track in _localStream!.getAudioTracks()) {
      track.enabled = true;
      await _peerConnection!.addTrack(track, _localStream!);
    }
    _log('VOICE: local audio track added (enabled=$microphoneEnabled)');

    _events = await _peerConnection!.createDataChannel('oai-events', RTCDataChannelInit());
    _handleDataChannel(_events!);
    final offer = await _peerConnection!.createOffer({'offerToReceiveAudio': 1});
    await _peerConnection!.setLocalDescription(offer);
    final answerSdp = await _exchangeSdp(credentials, offer.sdp ?? '');
    await _peerConnection!.setRemoteDescription(RTCSessionDescription(answerSdp, 'answer'));
    _log('VOICE: realtime connection established');
    _started = true;
  }

  void _handleDataChannel(RTCDataChannel channel) {
    _events = channel;
    channel.onDataChannelState = (state) {
      _log('VOICE: data channel state $state');
      if (state == RTCDataChannelState.RTCDataChannelOpen) _sendSessionUpdate();
    };
    channel.onMessage = (message) {
      try {
        final event = jsonDecode(message.text);
        if (event is Map<String, dynamic>) _handleEvent(event);
      } catch (_) {
        _log('VOICE: ERROR invalid realtime event');
      }
    };
  }

  void _sendSessionUpdate() {
    _events?.send(RTCDataChannelMessage(jsonEncode({
      'type': 'session.update',
      'session': {
        'turn_detection': {'type': 'server_vad', 'create_response': true, 'interrupt_response': true},
        'modalities': ['text', 'audio'],
      },
    })));
  }

  void _handleEvent(Map<String, dynamic> event) {
    final type = event['type'];
    switch (type) {
      case 'input_audio_buffer.speech_started':
        _log('VOICE: speech started');
      case 'input_audio_buffer.speech_stopped':
        _log('VOICE: speech stopped');
      case 'response.created':
        _log('VOICE: response created');
      case 'response.audio.delta':
        _log('VOICE: remote audio received');
      case 'response.done':
        _log('VOICE: response completed');
      case 'error':
        _log('VOICE: ERROR ${event['error'] ?? event}');
    }
  }

  Future<String> _exchangeSdp(_VoiceSessionCredentials credentials, String offerSdp) async {
    final response = await http.post(Uri.parse(credentials.realtimeUrl), headers: {'Authorization': 'Bearer ${credentials.token}', 'Content-Type': 'application/sdp'}, body: offerSdp);
    if (response.statusCode < 200 || response.statusCode >= 300) {
      _log('VOICE: ERROR realtime SDP ${response.statusCode} ${response.body}');
      throw ApiException('Realtime connection failed.', statusCode: response.statusCode);
    }
    return response.body;
  }

  Future<void> stop() async {
    await _events?.close();
    await _localStream?.dispose();
    await _peerConnection?.close();
    await Helper.setSpeakerphoneOn(false);
    remoteRenderer.srcObject = null;
    await remoteRenderer.dispose();
    _events = null;
    _localStream = null;
    _peerConnection = null;
    _started = false;
  }

  void _log(String message) {
    // Keep diagnostics visible to Flutter logs and the Live Mode screen.
    debugPrint(message);
    _onLog?.call(message);
  }
}

class _VoiceSessionCredentials {
  const _VoiceSessionCredentials({required this.token, required this.realtimeUrl, required this.iceServers});

  final String token;
  final String realtimeUrl;
  final List<Map<String, dynamic>> iceServers;

  factory _VoiceSessionCredentials.fromResponse(Map<String, dynamic> response) {
    final nested = response['session'] is Map ? response['session'] as Map : response;
    final clientSecret = nested['client_secret'];
    final token = clientSecret is Map ? clientSecret['value'] : clientSecret;
    final resolvedToken = token ?? nested['token'] ?? nested['ephemeral_key'] ?? nested['access_token'];
    if (resolvedToken is! String || resolvedToken.isEmpty) {
      throw const ApiException('Voice session did not return realtime credentials.');
    }
    final url = nested['realtime_url'] ?? nested['realtimeUrl'] ?? const String.fromEnvironment('OPENAI_REALTIME_URL', defaultValue: 'https://api.openai.com/v1/realtime/calls');
    if (url is! String || url.isEmpty) throw const ApiException('Voice session did not return a realtime URL.');
    final rawIceServers = nested['ice_servers'];
    final iceServers = rawIceServers is List ? rawIceServers.whereType<Map>().map((server) => Map<String, dynamic>.from(server)).toList() : <Map<String, dynamic>>[];
    return _VoiceSessionCredentials(token: resolvedToken, realtimeUrl: url, iceServers: iceServers);
  }
}

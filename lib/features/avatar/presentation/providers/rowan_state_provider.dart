import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../domain/models/rowan_state.dart';

class RowanStateNotifier extends StateNotifier<RowanState> {
  RowanStateNotifier() : super(const RowanState());

  void setStatus(RowanStatus status, {String? message}) {
    state = state.copyWith(status: status, message: message);
  }

  void reset() {
    state = const RowanState();
  }
}

final rowanStateProvider = StateNotifierProvider<RowanStateNotifier, RowanState>((ref) {
  return RowanStateNotifier();
});

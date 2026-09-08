enum RowanStatus {
  idle,
  listening,
  thinking,
  searching,
  creating,
  speaking,
  error;

  String get label {
    return switch (this) {
      RowanStatus.idle => 'Idle',
      RowanStatus.listening => 'Listening...',
      RowanStatus.thinking => 'Thinking...',
      RowanStatus.searching => 'Searching...',
      RowanStatus.creating => 'Creating...',
      RowanStatus.speaking => 'Speaking...',
      RowanStatus.error => 'Error',
    };
  }
}

class RowanState {
  final RowanStatus status;
  final String? message;

  const RowanState({
    this.status = RowanStatus.idle,
    this.message,
  });

  RowanState copyWith({
    RowanStatus? status,
    String? message,
  }) {
    return RowanState(
      status: status ?? this.status,
      message: message ?? this.message,
    );
  }

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is RowanState &&
          runtimeType == other.runtimeType &&
          status == other.status &&
          message == other.message;

  @override
  int get hashCode => status.hashCode ^ message.hashCode;
}

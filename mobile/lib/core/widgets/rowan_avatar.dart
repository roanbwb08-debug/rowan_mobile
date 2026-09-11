import 'dart:math';
import 'package:flutter/material.dart';

enum RowanAvatarState { idle, thinking, speaking, listening, error, processing }

class RowanExpressiveAvatar extends StatefulWidget {
  final RowanAvatarState state;
  final double size;
  final double audioLevel;

  const RowanExpressiveAvatar({
    super.key,
    required this.state,
    this.size = 120,
    this.audioLevel = 0.0,
  });

  @override
  State<RowanExpressiveAvatar> createState() => _RowanExpressiveAvatarState();
}

class _RowanExpressiveAvatarState extends State<RowanExpressiveAvatar>
    with SingleTickerProviderStateMixin {
  late AnimationController _controller;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      vsync: this,
      duration: const Duration(seconds: 2),
    )..repeat();
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return AnimatedBuilder(
      animation: _controller,
      builder: (context, child) {
        return SizedBox(
          width: widget.size,
          height: widget.size,
          child: CustomPaint(
            painter: _RobotPainter(
              animationValue: _controller.value,
              state: widget.state,
              audioLevel: widget.audioLevel,
            ),
          ),
        );
      },
    );
  }
}

class _RobotPainter extends CustomPainter {
  final double animationValue;
  final RowanAvatarState state;
  final double audioLevel;

  _RobotPainter({
    required this.animationValue,
    required this.state,
    required this.audioLevel,
  });

  @override
  void paint(Canvas canvas, Size size) {
    final double radius = size.width / 2;
    final Offset center = Offset(size.width / 2, size.height / 2);

    // 1. Draw glowing background pulse
    final double pulseScale = state == RowanAvatarState.thinking || state == RowanAvatarState.processing
        ? 1.0 + sin(animationValue * pi * 2) * 0.1
        : state == RowanAvatarState.listening
            ? 1.0 + audioLevel * 0.3
            : 1.0;

    final Paint glowPaint = Paint()
      ..color = state == RowanAvatarState.error
          ? Colors.redAccent.withOpacity(0.15)
          : state == RowanAvatarState.listening
              ? Colors.tealAccent.withOpacity(0.15)
              : const Color(0xFF1E6091).withOpacity(0.15)
      ..style = PaintingStyle.fill
      ..maskFilter = MaskFilter.blur(BlurStyle.normal, radius * 0.4);

    canvas.drawCircle(center, radius * 0.95 * pulseScale, glowPaint);

    // 2. Draw metallic head/body rim
    final Paint headPaint = Paint()
      ..color = const Color(0xFF1E293B)
      ..style = PaintingStyle.fill;

    canvas.drawCircle(center, radius * 0.7, headPaint);

    // Silver inner faceplate
    final Paint faceplatePaint = Paint()
      ..color = const Color(0xFF0F172A)
      ..style = PaintingStyle.fill;

    canvas.drawCircle(center, radius * 0.62, faceplatePaint);

    // 3. Draw metallic ears/antenna connectors
    final Paint earPaint = Paint()
      ..color = const Color(0xFF475569)
      ..style = PaintingStyle.fill;

    canvas.drawRect(
      Rect.fromCenter(center: Offset(center.dx - radius * 0.7, center.dy), width: radius * 0.15, height: radius * 0.3),
      earPaint,
    );
    canvas.drawRect(
      Rect.fromCenter(center: Offset(center.dx + radius * 0.7, center.dy), width: radius * 0.15, height: radius * 0.3),
      earPaint,
    );

    // 4. Draw eyes based on states
    final Color eyeColor = state == RowanAvatarState.error
        ? Colors.redAccent
        : state == RowanAvatarState.listening
            ? Colors.tealAccent
            : const Color(0xFF38BDF8);

    final Paint eyePaint = Paint()
      ..color = eyeColor
      ..style = PaintingStyle.fill;

    final double eyeOffset = radius * 0.22;
    final double eyeY = center.dy - radius * 0.05;

    final Offset leftEyeCenter = Offset(center.dx - eyeOffset, eyeY);
    final Offset rightEyeCenter = Offset(center.dx + eyeOffset, eyeY);

    if (state == RowanAvatarState.thinking || state == RowanAvatarState.processing) {
      // Rotating/thinking glowing semi-circles
      final double angle = animationValue * pi * 2;
      canvas.save();
      canvas.translate(leftEyeCenter.dx, leftEyeCenter.dy);
      canvas.rotate(angle);
      canvas.drawArc(
        Rect.fromCircle(center: Offset.zero, radius: radius * 0.14),
        0,
        pi,
        true,
        eyePaint,
      );
      canvas.restore();

      canvas.save();
      canvas.translate(rightEyeCenter.dx, rightEyeCenter.dy);
      canvas.rotate(-angle);
      canvas.drawArc(
        Rect.fromCircle(center: Offset.zero, radius: radius * 0.14),
        0,
        pi,
        true,
        eyePaint,
      );
      canvas.restore();
    } else if (state == RowanAvatarState.speaking) {
      // Speaking bouncy oval eyes
      final double wave = sin(animationValue * pi * 8) * 0.03 + 0.12;
      canvas.drawOval(
        Rect.fromCenter(center: leftEyeCenter, width: radius * 0.16, height: radius * wave),
        eyePaint,
      );
      canvas.drawOval(
        Rect.fromCenter(center: rightEyeCenter, width: radius * 0.16, height: radius * wave),
        eyePaint,
      );
    } else if (state == RowanAvatarState.listening) {
      // Audio level visualizers as eyes or glowing circles
      final double eyeSize = radius * (0.12 + audioLevel * 0.08);
      canvas.drawCircle(leftEyeCenter, eyeSize, eyePaint);
      canvas.drawCircle(rightEyeCenter, eyeSize, eyePaint);
    } else if (state == RowanAvatarState.error) {
      // Angular/Angry X eyes
      _drawCrossEye(canvas, leftEyeCenter, radius * 0.1);
      _drawCrossEye(canvas, rightEyeCenter, radius * 0.1);
    } else {
      // Standard friendly horizontal capsules (idle)
      canvas.drawOval(
        Rect.fromCenter(center: leftEyeCenter, width: radius * 0.18, height: radius * 0.12),
        eyePaint,
      );
      canvas.drawOval(
        Rect.fromCenter(center: rightEyeCenter, width: radius * 0.18, height: radius * 0.12),
        eyePaint,
      );
    }

    // 5. Friendly mouth
    final Paint mouthPaint = Paint()
      ..color = const Color(0xFF475569)
      ..style = PaintingStyle.stroke
      ..strokeWidth = radius * 0.04
      ..strokeCap = StrokeCap.round;

    final double mouthY = center.dy + radius * 0.22;

    if (state == RowanAvatarState.error) {
      // Sad straight line or slight curve down
      canvas.drawLine(
        Offset(center.dx - radius * 0.15, mouthY),
        Offset(center.dx + radius * 0.15, mouthY),
        mouthPaint,
      );
    } else if (state == RowanAvatarState.speaking) {
      // Small active circle mouth
      final Paint activeMouthFill = Paint()
        ..color = const Color(0xFF475569)
        ..style = PaintingStyle.fill;
      canvas.drawCircle(center + Offset(0, radius * 0.22), radius * 0.06, activeMouthFill);
    } else {
      // Friendly smile
      final Path mouthPath = Path();
      mouthPath.moveTo(center.dx - radius * 0.15, mouthY - radius * 0.02);
      mouthPath.quadraticBezierTo(
        center.dx,
        mouthY + radius * 0.08,
        center.dx + radius * 0.15,
        mouthY - radius * 0.02,
      );
      canvas.drawPath(mouthPath, mouthPaint);
    }
  }

  void _drawCrossEye(Canvas canvas, Offset center, double size) {
    final Paint xPaint = Paint()
      ..color = Colors.redAccent
      ..strokeWidth = size * 0.3
      ..strokeCap = StrokeCap.round;

    canvas.drawLine(
      Offset(center.dx - size, center.dy - size),
      Offset(center.dx + size, center.dy + size),
      xPaint,
    );
    canvas.drawLine(
      Offset(center.dx + size, center.dy - size),
      Offset(center.dx - size, center.dy + size),
      xPaint,
    );
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => true;
}

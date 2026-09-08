import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../domain/models/rowan_module.dart';

final moduleProvider = StateProvider<RowanModule>((ref) {
  return RowanModule.registry.first; // Default to OMNI
});

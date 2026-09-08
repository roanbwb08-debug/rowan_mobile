import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../data/research_api.dart';

final researchControllerProvider =
AsyncNotifierProvider<ResearchController, Map<String, dynamic>?>(
  ResearchController.new,
);

class ResearchController
    extends AsyncNotifier<Map<String, dynamic>?> {
  @override
  Future<Map<String, dynamic>?> build() async {
    return null;
  }

  Future<void> search(String query) async {
    if (query.trim().isEmpty) return;

    state = const AsyncLoading();

    try {
      final api = ref.read(researchApiProvider);
      final result = await api.research(query.trim());

      state = AsyncData(result);
    } catch (e, stackTrace) {
      state = AsyncError(e, stackTrace);
    }
  }
}
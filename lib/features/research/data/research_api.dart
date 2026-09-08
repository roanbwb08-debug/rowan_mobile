import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/network/dio_client.dart';

final researchApiProvider = Provider<ResearchApi>((ref) {
  final dio = ref.read(dioProvider);
  return ResearchApi(dio);
});

class ResearchApi {
  ResearchApi(this._dio);

  final Dio _dio;

  static const String baseUrl = String.fromEnvironment(
    'ROWAN_BACKEND_URL',
    defaultValue: 'http://localhost:3000',
  );

  Future<Map<String, dynamic>> research(String query) async {
    try {
      final response = await _dio.post(
        '$baseUrl/api/research',
        data: {
          'query': query,
        },
      );

      return Map<String, dynamic>.from(response.data);
    } on DioException catch (e) {
      throw Exception(
        'Rowan connection failed: ${e.type} - ${e.message}',
      );
    }
  }
}
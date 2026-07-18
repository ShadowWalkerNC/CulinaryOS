import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:riverpod_annotation/riverpod_annotation.dart';
import 'package:uuid/uuid.dart';

part 'prompt_execution_service.g.dart';

/// All available prompt names — matches Edge Function routes
abstract class PromptName {
  static const menuDescriptionWriter   = 'menu-description-writer';
  static const scheduleAiSuggest       = 'schedule-ai-suggest';
  static const weeklyBusinessReview    = 'weekly-business-review';
  static const quarterlyBusinessReview = 'quarterly-business-review';
  static const prepListForecast        = 'prep-list-forecast';
  static const winBackSmsDraft         = 'win-back-sms-draft';
  static const menuEngineeringAction   = 'menu-engineering-action';
  static const vendorReorderDraft      = 'vendor-reorder-draft';
  static const recipeCostOptimizer     = 'recipe-cost-optimizer';
}

enum AiReviewStatus { pending, approved, edited, rejected }

class PromptResult {
  final String promptName;
  final String promptVersion;
  final Map<String, dynamic> inputs;
  final String rawOutput;
  AiReviewStatus reviewStatus;

  PromptResult({
    required this.promptName,
    required this.promptVersion,
    required this.inputs,
    required this.rawOutput,
    this.reviewStatus = AiReviewStatus.pending,
  });
}

@riverpod
PromptExecutionService promptExecutionService(PromptExecutionServiceRef ref) {
  return PromptExecutionService();
}

class PromptExecutionService {
  static const _baseUrl = 'https://api.culinaryos.com/v1';

  Future<PromptResult> execute({
    required String promptName,
    required Map<String, dynamic> inputs,
    required String jwt,
  }) async {
    final response = await http.post(
      Uri.parse('$_baseUrl/ai/$promptName'),
      headers: {
        'Authorization': 'Bearer $jwt',
        'Content-Type': 'application/json',
        'X-Mutation-Id': const Uuid().v4(),
      },
      body: jsonEncode(inputs),
    );

    if (response.statusCode != 200) {
      throw Exception('AI prompt failed: \${response.statusCode}');
    }

    final data = jsonDecode(response.body) as Map<String, dynamic>;

    return PromptResult(
      promptName: promptName,
      promptVersion: data['prompt_version'] as String,
      inputs: inputs,
      rawOutput: data['output'] as String,
    );
  }
}

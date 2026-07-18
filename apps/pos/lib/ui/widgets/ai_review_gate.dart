import 'package:flutter/material.dart';
import '../../services/ai/prompt_execution_service.dart';

/// AI Review Gate — every prompt result must pass through this widget.
/// No AI output is ever applied without an explicit operator decision.
class AiReviewGate extends StatefulWidget {
  final PromptResult result;
  final void Function(PromptResult approved) onApprove;
  final void Function(String edited) onEdit;
  final void Function() onReject;

  const AiReviewGate({
    super.key,
    required this.result,
    required this.onApprove,
    required this.onEdit,
    required this.onReject,
  });

  @override
  State<AiReviewGate> createState() => _AiReviewGateState();
}

class _AiReviewGateState extends State<AiReviewGate> {
  late TextEditingController _editController;

  @override
  void initState() {
    super.initState();
    _editController = TextEditingController(text: widget.result.rawOutput);
  }

  @override
  void dispose() {
    _editController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Review AI Output')),
      body: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Prompt: \${widget.result.promptName}  •  Version: \${widget.result.promptVersion}',
              style: Theme.of(context).textTheme.labelSmall,
            ),
            const SizedBox(height: 12),
            Expanded(
              child: TextField(
                controller: _editController,
                maxLines: null,
                expands: true,
                decoration: const InputDecoration(
                  border: OutlineInputBorder(),
                  labelText: 'AI Output — Edit if needed',
                ),
              ),
            ),
            const SizedBox(height: 16),
            Row(
              children: [
                Expanded(
                  child: FilledButton.icon(
                    icon: const Icon(Icons.check),
                    label: const Text('Approve'),
                    onPressed: () {
                      widget.result.reviewStatus = AiReviewStatus.approved;
                      widget.onApprove(widget.result);
                    },
                  ),
                ),
                const SizedBox(width: 8),
                Expanded(
                  child: OutlinedButton.icon(
                    icon: const Icon(Icons.edit),
                    label: const Text('Apply Edit'),
                    onPressed: () {
                      widget.result.reviewStatus = AiReviewStatus.edited;
                      widget.onEdit(_editController.text);
                    },
                  ),
                ),
                const SizedBox(width: 8),
                Expanded(
                  child: OutlinedButton.icon(
                    style: OutlinedButton.styleFrom(
                        foregroundColor: Colors.red),
                    icon: const Icon(Icons.close),
                    label: const Text('Reject'),
                    onPressed: () {
                      widget.result.reviewStatus = AiReviewStatus.rejected;
                      widget.onReject();
                    },
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}

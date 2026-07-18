import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:pdf/widgets.dart' as pw;
import 'package:printing/printing.dart';
import '../../services/ai/prompt_execution_service.dart';
import '../widgets/ai_review_gate.dart';

enum MenuLayout { printReady, digital }

class MenuDesignerScreen extends ConsumerStatefulWidget {
  const MenuDesignerScreen({super.key});

  @override
  ConsumerState<MenuDesignerScreen> createState() =>
      _MenuDesignerScreenState();
}

class _MenuDesignerScreenState
    extends ConsumerState<MenuDesignerScreen> {
  MenuLayout _selectedLayout = MenuLayout.printReady;

  void _generateAiDescription(dynamic item) async {
    final jwt = ref.read(authProvider).jwt;
    final service = ref.read(promptExecutionServiceProvider);
    final result = await service.execute(
      promptName: PromptName.menuDescriptionWriter,
      inputs: {
        'item_name': item.name,
        'key_ingredients': item.ingredients,
        'tone': 'casual',
      },
      jwt: jwt,
    );
    if (!mounted) return;
    Navigator.push(
      context,
      MaterialPageRoute(
        builder: (_) => AiReviewGate(
          result: result,
          onApprove: (r) => Navigator.pop(context),
          onEdit: (edited) => Navigator.pop(context),
          onReject: () => Navigator.pop(context),
        ),
      ),
    );
  }

  Future<void> _exportToPdf(List<dynamic> items) async {
    final pdf = pw.Document();
    pdf.addPage(
      pw.MultiPage(
        build: (context) => [
          pw.Header(level: 0, text: 'Menu'),
          ...items.map(
            (item) => pw.Column(
              crossAxisAlignment: pw.CrossAxisAlignment.start,
              children: [
                pw.Row(
                  mainAxisAlignment:
                      pw.MainAxisAlignment.spaceBetween,
                  children: [
                    pw.Text(item.name,
                        style: pw.TextStyle(
                            fontWeight: pw.FontWeight.bold)),
                    pw.Text(
                        '\$\${(item.price as double).toStringAsFixed(2)}'),
                  ],
                ),
                if (item.description != null)
                  pw.Text(item.description as String,
                      style: const pw.TextStyle(fontSize: 10)),
                pw.SizedBox(height: 8),
              ],
            ),
          ),
        ],
      ),
    );
    await Printing.layoutPdf(
        onLayout: (_) async => pdf.save());
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Menu Designer'),
        actions: [
          SegmentedButton<MenuLayout>(
            segments: const [
              ButtonSegment(
                  value: MenuLayout.printReady, label: Text('Print')),
              ButtonSegment(
                  value: MenuLayout.digital, label: Text('Digital')),
            ],
            selected: {_selectedLayout},
            onSelectionChanged: (s) =>
                setState(() => _selectedLayout = s.first),
          ),
          IconButton(
            icon: const Icon(Icons.picture_as_pdf),
            tooltip: 'Export PDF',
            onPressed: () => _exportToPdf([]),
          ),
        ],
      ),
      body: Center(
        child: Text(
          _selectedLayout == MenuLayout.printReady
              ? 'Print-Ready Layout'
              : 'Digital Layout',
        ),
      ),
    );
  }
}

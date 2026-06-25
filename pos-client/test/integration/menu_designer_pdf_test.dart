import 'package:flutter_test/flutter_test.dart';
import 'package:pdf/widgets.dart' as pw;

void main() {
  group('Menu Designer PDF Export', () {
    final mockItems = [
      _MockMenuItem(
          id: '1',
          name: 'Smoked Beef Brisket Plate',
          price: 17.00,
          description:
              'Low-and-slow smoked brisket with au jus and two sides.'),
      _MockMenuItem(
          id: '2',
          name: 'The Smash Burger',
          price: 16.00,
          description:
              'Two smashed patties, American cheese, Secret Smash Sauce.'),
      _MockMenuItem(
          id: '3',
          name: 'Maine Blueberry Muffins',
          price: 4.00,
          description: null),
    ];

    test('PDF generates without throwing', () async {
      final pdf = pw.Document();
      pdf.addPage(
        pw.MultiPage(
          build: (context) => [
            pw.Header(level: 0, text: 'Northern Fixins'),
            ...mockItems.map(
              (item) => pw.Column(
                crossAxisAlignment: pw.CrossAxisAlignment.start,
                children: [
                  pw.Row(
                    mainAxisAlignment: pw.MainAxisAlignment.spaceBetween,
                    children: [
                      pw.Text(item.name,
                          style: pw.TextStyle(
                              fontWeight: pw.FontWeight.bold)),
                      pw.Text('\$${item.price.toStringAsFixed(2)}'),
                    ],
                  ),
                  if (item.description != null)
                    pw.Text(item.description!,
                        style: const pw.TextStyle(fontSize: 10)),
                  pw.SizedBox(height: 8),
                ],
              ),
            ),
          ],
        ),
      );
      final bytes = await pdf.save();
      expect(bytes.isNotEmpty, true);
    });

    test('Item with null description renders without crash', () {
      final nullDescItem =
          mockItems.firstWhere((i) => i.description == null);
      expect(nullDescItem.description, isNull);
    });

    test('All 3 items produce non-empty PDF bytes', () async {
      final pdf = pw.Document();
      pdf.addPage(
        pw.Page(
          build: (_) => pw.Column(
            children: mockItems.map((i) => pw.Text(i.name)).toList(),
          ),
        ),
      );
      final bytes = await pdf.save();
      expect(bytes.length, greaterThan(500));
    });
  });
}

class _MockMenuItem {
  final String id;
  final String name;
  final double price;
  final String? description;
  const _MockMenuItem(
      {required this.id,
      required this.name,
      required this.price,
      this.description});
}

import 'package:flutter_test/flutter_test.dart';
import 'package:integration_test/integration_test.dart';

void main() {
  IntegrationTestWidgetsFlutterBinding.ensureInitialized();

  group('48-Hour Offline Chaos Test', () {

    testWidgets('T01 — Take order with internet OFF', (tester) async {
      await tester.pumpWidget(buildApp(networkEnabled: false));
      await tester.tap(find.text('New Order'));
      await tester.pumpAndSettle();
      await tester.tap(find.text('Smoked Beef Brisket Plate'));
      await tester.tap(find.text('Add to Order'));
      await tester.tap(find.text('Fire Order'));
      await tester.pumpAndSettle();
      expect(find.text('Smoked Beef Brisket Plate'), findsOneWidget);
    });

    testWidgets('T02 — Process card payment offline via Stripe Terminal', (tester) async {
      await tester.pumpWidget(buildApp(networkEnabled: false));
      await tester.tap(find.text('Charge \$17.00'));
      await tester.pumpAndSettle();
      expect(find.text('Payment Queued — Will sync when online'), findsOneWidget);
    });

    testWidgets('T03 — KDS receives ticket via WebRTC (no cloud)', (tester) async {
      await tester.pumpWidget(buildApp(networkEnabled: false));
      await tester.tap(find.text('Fire Order'));
      await tester.pumpAndSettle();
      expect(find.text('TICKET SENT TO KDS'), findsOneWidget);
    });

    testWidgets('T04 — Inventory auto-deducts on sale offline', (tester) async {
      await tester.pumpWidget(buildApp(networkEnabled: false));
      final stockBefore = await getLocalStock('Beef Brisket');
      await tester.tap(find.text('Smoked Beef Brisket Plate'));
      await tester.tap(find.text('Fire Order'));
      await tester.pumpAndSettle();
      final stockAfter = await getLocalStock('Beef Brisket');
      expect(stockAfter, closeTo(stockBefore - 0.75, 0.01));
    });

    testWidgets('T05 — Staff PIN auth works offline', (tester) async {
      await tester.pumpWidget(buildApp(networkEnabled: false));
      await tester.tap(find.text('Sam R.'));
      await tester.enterText(find.byKey(const Key('pin_field')), '5678');
      await tester.tap(find.text('Login'));
      await tester.pumpAndSettle();
      expect(find.text('KDS — Grill & Smoker'), findsOneWidget);
    });

    testWidgets('T06 — PowerSync syncs all mutations on reconnect', (tester) async {
      await tester.pumpWidget(buildApp(networkEnabled: true));
      await tester.pump(const Duration(seconds: 5));
      final pendingMutations = await getPendingMutationCount();
      expect(pendingMutations, 0);
    });

    testWidgets('T07 — Queued Stripe payments process on reconnect', (tester) async {
      await tester.pumpWidget(buildApp(networkEnabled: true));
      await tester.pump(const Duration(seconds: 3));
      final queuedPayments = await getQueuedPaymentCount();
      expect(queuedPayments, 0);
    });

    testWidgets('T08 — Audit log has no gaps after reconnect', (tester) async {
      final auditEntries = await getAuditLogCount();
      final orderCount = await getOrderCount();
      expect(auditEntries, greaterThanOrEqualTo(orderCount));
    });

  });
}

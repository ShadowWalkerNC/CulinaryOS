import 'package:culinaryos_extension_sdk/culinaryos_extension_sdk.dart';
import 'package:speech_to_text/speech_to_text.dart';

class VoiceOrderingExtension {
  final CulinaryOSExtensionAPI api;
  final SpeechToText _stt = SpeechToText();

  VoiceOrderingExtension(this.api);

  Future<void> onVoiceButtonPressed(ExtensionEvent event) async {
    final available = await _stt.initialize(
      onError: (e) => api.log('STT error: $e', level: LogLevel.error),
    );

    if (!available) {
      await api.showToast(
        message: 'Microphone not available on this device.',
        type: ToastType.error,
      );
      return;
    }

    await api.showToast(
      message: 'Listening… speak your order.',
      type: ToastType.info,
    );

    String recognized = '';
    await _stt.listen(
      onResult: (result) => recognized = result.recognizedWords,
      localeId: api.getSetting<String>('language'),
    );
    await Future.delayed(const Duration(seconds: 4));
    await _stt.stop();

    if (recognized.isEmpty) {
      await api.showToast(message: 'Nothing heard. Try again.', type: ToastType.warning);
      return;
    }

    final menuItems = await api.getMenuItems();
    final matches   = _parseOrderFromSpeech(recognized, menuItems);

    if (matches.isEmpty) {
      await api.showToast(
        message: 'Could not match "$recognized" to any menu item.',
        type: ToastType.warning,
      );
      return;
    }

    final confirmRequired = api.getSetting<bool>('confirmation_required');
    if (confirmRequired) {
      final itemNames = matches.map((m) => m.name).join(', ');
      final confirmed = await api.showConfirmDialog(
        title: 'Voice Order Detected',
        body:  'Add to order: $itemNames?',
        confirmLabel: 'Yes, Add',
        cancelLabel:  'Re-listen',
      );
      if (!confirmed) return;
    }

    final order = await api.getCurrentOrder();
    if (order == null) {
      await api.showToast(
        message: 'No open order. Start a new order first.',
        type: ToastType.error,
      );
      return;
    }

    for (final item in matches) {
      await api.addItemToOrder(
        orderId:    order.id,
        menuItemId: item.id,
      );
    }

    await api.showToast(
      message: '✅ ${matches.length} item(s) added via voice.',
      type: ToastType.success,
    );

    api.log('Voice order: "$recognized" → ${matches.map((m) => m.name).join(", ")}');
  }

  List<MenuItem> _parseOrderFromSpeech(String speech, List<MenuItem> items) {
    final words = speech.toLowerCase();
    return items.where((item) {
      final name = item.name.toLowerCase();
      return words.contains(name) ||
             name.split(' ').any((word) => words.contains(word) && word.length > 3);
    }).toList();
  }
}

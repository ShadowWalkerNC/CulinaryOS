import 'dart:isolate';
import 'package:flutter/foundation.dart';
import 'package:culinaryos/extensions/sdk/sandboxed_api_impl.dart';

class ExtensionRunner {
  final String extensionId;
  final Map<String, dynamic> manifest;

  Isolate? _isolate;
  ReceivePort? _receivePort;
  bool _crashed = false;

  ExtensionRunner({required this.extensionId, required this.manifest});

  Future<void> start() async {
    _receivePort = ReceivePort();
    _isolate = await Isolate.spawn(
      _extensionEntryPoint,
      _ExtensionBootstrap(
        sendPort:    _receivePort!.sendPort,
        extensionId: extensionId,
        manifest:    manifest,
      ),
      debugName:      'ext:$extensionId',
      errorsAreFatal: false,
    );
    _receivePort!.listen(_handleMessage, onError: _handleIsolateError);
  }

  void _handleMessage(dynamic message) {
    if (message is _ExtensionAPICall) {
      _dispatchAPICall(message);
    }
  }

  void _handleIsolateError(dynamic error) {
    _crashed = true;
    debugPrint('[ExtensionRunner] Extension $extensionId crashed: $error');
    _notifyDashboard(error);
  }

  Future<void> _dispatchAPICall(_ExtensionAPICall call) async {
    final api = SandboxedAPIImpl(
      extensionId: extensionId,
      manifest:    manifest,
    );
    try {
      final result = await api.dispatch(call.method, call.args);
      // Proxy UI calls back to main isolate
      if (result is Map && result['__proxy__'] == true) {
        final uiResult = await _handleUIProxy(result['method'], result['args']);
        call.replyPort.send(_ExtensionAPIResult(result: uiResult));
      } else {
        call.replyPort.send(_ExtensionAPIResult(result: result));
      }
    } catch (e) {
      call.replyPort.send(_ExtensionAPIResult(error: e.toString()));
    }
  }

  Future<dynamic> _handleUIProxy(String method, Map<String, dynamic> args) async {
    // Dispatched on main isolate — extensions never hold BuildContext
    // Actual implementation wires to Flutter overlay system
    return null;
  }

  Future<void> stop() async {
    _isolate?.kill(priority: Isolate.immediate);
    _receivePort?.close();
    _isolate = null;
  }

  bool get isRunning => _isolate != null && !_crashed;
  bool get hasCrashed => _crashed;

  void _notifyDashboard(dynamic error) {
    // Push crash to extension_error_log via main isolate DB handle
  }
}

void _extensionEntryPoint(_ExtensionBootstrap bootstrap) {
  // Extension code executes here — fully isolated from main app
}

class _ExtensionBootstrap {
  final SendPort sendPort;
  final String extensionId;
  final Map<String, dynamic> manifest;
  const _ExtensionBootstrap({
    required this.sendPort,
    required this.extensionId,
    required this.manifest,
  });
}

class _ExtensionAPICall {
  final String method;
  final Map<String, dynamic> args;
  final SendPort replyPort;
  const _ExtensionAPICall({
    required this.method,
    required this.args,
    required this.replyPort,
  });
}

class _ExtensionAPIResult {
  final dynamic result;
  final String? error;
  const _ExtensionAPIResult({this.result, this.error});
}

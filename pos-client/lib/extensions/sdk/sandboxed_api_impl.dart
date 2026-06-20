import 'dart:async';
import 'package:drift/drift.dart';
import 'package:culinaryos/database/app_database.dart';
import 'package:culinaryos/extensions/sdk/culinaryos_extension_api.dart';
import 'package:culinaryos/repositories/order_repository.dart';
import 'package:culinaryos/repositories/menu_repository.dart';
import 'package:culinaryos/audit/audit_log.dart';

/// Dispatches extension API calls with permission enforcement,
/// rate limiting, and audit logging.
/// Extensions never hold DB references — all access is gated here.
class SandboxedAPIImpl {
  final String extensionId;
  final Map<String, dynamic> manifest;
  final AppDatabase _db;
  final OrderRepository _orders;
  final MenuRepository _menu;
  final AuditLog _audit;

  final Map<String, List<DateTime>> _callHistory = {};
  static const int _maxCallsPerMinute = 60;

  SandboxedAPIImpl({
    required this.extensionId,
    required this.manifest,
    AppDatabase? db,
    OrderRepository? orders,
    MenuRepository? menu,
    AuditLog? audit,
  })  : _db     = db     ?? AppDatabase.instance,
        _orders = orders ?? OrderRepository.instance,
        _menu   = menu   ?? MenuRepository.instance,
        _audit  = audit  ?? AuditLog.instance;

  // ── Permission Registry ──────────────────────────────────────────────────

  static const Map<String, List<String>> _permissionMap = {
    'getMenuItems':        ['menu.read'],
    'getModifierGroups':   ['menu.read', 'modifiers.read'],
    'getCurrentOrder':     ['orders.read'],
    'addItemToOrder':      ['orders.write'],
    'removeItemFromOrder': ['orders.write'],
    'getSetting':          [],
    'setSetting':          [],
    'showToast':           [],
    'showBottomSheet':     [],
    'showConfirmDialog':   [],
    'log':                 [],
  };

  List<String> get _grantedPermissions =>
      List<String>.from(manifest['permissions'] ?? []);

  bool _hasPermission(String method) {
    final required = _permissionMap[method] ?? [];
    if (required.isEmpty) return true;
    return required.every((p) => _grantedPermissions.contains(p));
  }

  // ── Rate Limiter ─────────────────────────────────────────────────────────

  bool _checkRateLimit(String method) {
    final now    = DateTime.now();
    final window = now.subtract(const Duration(minutes: 1));
    _callHistory[method] ??= [];
    _callHistory[method]!.removeWhere((t) => t.isBefore(window));
    if (_callHistory[method]!.length >= _maxCallsPerMinute) return false;
    _callHistory[method]!.add(now);
    return true;
  }

  // ── Dispatcher ───────────────────────────────────────────────────────────

  Future<dynamic> dispatch(String method, Map<String, dynamic> args) async {
    if (!_hasPermission(method)) {
      await _logViolation(method, 'permission_denied');
      throw ExtensionSecurityException(
        'Extension $extensionId called $method without required permission '
        '${_permissionMap[method]}. Granted: $_grantedPermissions',
      );
    }
    if (!_checkRateLimit(method)) {
      await _logViolation(method, 'rate_limit_exceeded');
      throw ExtensionRateLimitException(
        'Extension $extensionId exceeded rate limit on $method '
        '($_maxCallsPerMinute calls/minute).',
      );
    }
    return switch (method) {
      'getMenuItems'        => _getMenuItems(),
      'getModifierGroups'   => _getModifierGroups(args),
      'getCurrentOrder'     => _getCurrentOrder(),
      'addItemToOrder'      => _addItemToOrder(args),
      'removeItemFromOrder' => _removeItemFromOrder(args),
      'getSetting'          => _getSetting(args),
      'setSetting'          => _setSetting(args),
      'log'                 => _logExtensionMessage(args),
      'showToast'           => _proxyToMainIsolate(method, args),
      'showBottomSheet'     => _proxyToMainIsolate(method, args),
      'showConfirmDialog'   => _proxyToMainIsolate(method, args),
      _                     => throw ExtensionMethodNotFoundException(
                                'Unknown API method: $method'),
    };
  }

  // ── Implementations ──────────────────────────────────────────────────────

  Future<List<Map<String, dynamic>>> _getMenuItems() async {
    final rows = await _menu.getItemsForCurrentLocation();
    return rows.map((r) => {
      'id':         r.id,
      'name':       r.name,
      'priceCents': r.priceCents,
      'allergens':  r.allergens,
      'is86d':      r.is86d,
    }).toList();
  }

  Future<List<Map<String, dynamic>>> _getModifierGroups(
      Map<String, dynamic> args) async {
    final itemId = args['itemId'] as String?;
    if (itemId == null) throw ArgumentError('itemId required');
    final groups = await _menu.getModifierGroupsForItem(itemId);
    return groups.map((g) => {
      'id':            g.id,
      'name':          g.name,
      'minSelections': g.minSelections,
      'maxSelections': g.maxSelections,
      'options': g.options.map((o) => {
        'id':              o.id,
        'name':            o.name,
        'priceDeltaCents': o.priceDeltaCents,
      }).toList(),
    }).toList();
  }

  Future<Map<String, dynamic>?> _getCurrentOrder() async {
    final order = await _orders.getCurrentOpenOrder();
    if (order == null) return null;
    return {
      'id':            order.id,
      'subtotalCents': order.subtotalCents,
      'status':        order.status.name,
      'items': order.items.map((i) => {
        'id':                  i.id,
        'menuItemId':          i.menuItemId,
        'menuItemName':        i.menuItemName,
        'selectedModifierIds': i.selectedModifierIds,
        'specialNote':         i.specialNote,
      }).toList(),
    };
  }

  Future<void> _addItemToOrder(Map<String, dynamic> args) async {
    final orderId     = args['orderId']     as String?;
    final menuItemId  = args['menuItemId']  as String?;
    final modifierIds = List<String>.from(args['selectedModifierIds'] ?? []);
    final specialNote = args['specialNote'] as String?;
    if (orderId == null || menuItemId == null) {
      throw ArgumentError('orderId and menuItemId required');
    }
    final item = await _menu.getItemById(menuItemId);
    if (item == null) throw ExtensionValidationException('Menu item $menuItemId not found.');
    if (item.is86d)   throw ExtensionValidationException('Item ${item.name} is currently 86\'d.');
    await _orders.addItem(
      orderId:     orderId,
      menuItemId:  menuItemId,
      modifierIds: modifierIds,
      specialNote: specialNote,
    );
    await _audit.write(
      action:   'extension.order.add_item',
      entityId: orderId,
      metadata: {
        'extension_id': extensionId,
        'menu_item_id': menuItemId,
        'modifiers':    modifierIds,
      },
    );
  }

  Future<void> _removeItemFromOrder(Map<String, dynamic> args) async {
    final orderId     = args['orderId']     as String?;
    final orderItemId = args['orderItemId'] as String?;
    if (orderId == null || orderItemId == null) {
      throw ArgumentError('orderId and orderItemId required');
    }
    await _orders.removeItem(orderId: orderId, orderItemId: orderItemId);
    await _audit.write(
      action:   'extension.order.remove_item',
      entityId: orderId,
      metadata: {'extension_id': extensionId, 'order_item_id': orderItemId},
    );
  }

  Future<dynamic> _getSetting(Map<String, dynamic> args) async {
    final key = args['key'] as String?;
    if (key == null) throw ArgumentError('key required');
    final row = await (_db.select(_db.installedExtensions)
          ..where((t) => t.extensionId.equals(extensionId)))
        .getSingleOrNull();
    final settings = (row?.settings as Map<String, dynamic>?) ?? {};
    if (settings.containsKey(key)) return settings[key];
    final schema = (manifest['settings_schema'] as List<dynamic>? ?? [])
        .cast<Map<String, dynamic>>();
    final field = schema.firstWhere((s) => s['key'] == key, orElse: () => {});
    return field['default'];
  }

  Future<void> _setSetting(Map<String, dynamic> args) async {
    final key   = args['key'];
    final value = args['value'];
    if (key == null) throw ArgumentError('key required');
    final schema = (manifest['settings_schema'] as List<dynamic>? ?? [])
        .cast<Map<String, dynamic>>();
    final declared = schema.any((s) => s['key'] == key);
    if (!declared) {
      throw ExtensionSecurityException(
        'Extension $extensionId attempted to set undeclared setting "$key".',
      );
    }
    final current = await _getSetting({'key': '__all__'}) as Map<String, dynamic>? ?? {};
    await (_db.update(_db.installedExtensions)
          ..where((t) => t.extensionId.equals(extensionId)))
        .write(InstalledExtensionsCompanion(
          settings: Value({...current, key: value}),
        ));
  }

  Future<void> _logExtensionMessage(Map<String, dynamic> args) async {
    final message = args['message'] as String? ?? '';
    final level   = args['level']   as String? ?? 'info';
    await _db.into(_db.extensionErrorLog).insert(
      ExtensionErrorLogCompanion.insert(
        extensionId:  extensionId,
        errorMessage: '[$level] $message',
        occurredAt:   Value(DateTime.now()),
      ),
    );
  }

  Future<dynamic> _proxyToMainIsolate(
      String method, Map<String, dynamic> args) async {
    return {'__proxy__': true, 'method': method, 'args': args};
  }

  Future<void> _logViolation(String method, String reason) async {
    await _db.into(_db.extensionErrorLog).insert(
      ExtensionErrorLogCompanion.insert(
        extensionId:  extensionId,
        errorMessage: 'SECURITY_VIOLATION method=$method reason=$reason',
        occurredAt:   Value(DateTime.now()),
      ),
    );
  }
}

class ExtensionSecurityException implements Exception {
  final String message;
  const ExtensionSecurityException(this.message);
  @override String toString() => 'ExtensionSecurityException: $message';
}

class ExtensionRateLimitException implements Exception {
  final String message;
  const ExtensionRateLimitException(this.message);
  @override String toString() => 'ExtensionRateLimitException: $message';
}

class ExtensionValidationException implements Exception {
  final String message;
  const ExtensionValidationException(this.message);
  @override String toString() => 'ExtensionValidationException: $message';
}

class ExtensionMethodNotFoundException implements Exception {
  final String message;
  const ExtensionMethodNotFoundException(this.message);
  @override String toString() => 'ExtensionMethodNotFoundException: $message';
}

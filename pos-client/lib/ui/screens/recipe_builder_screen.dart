import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../data/repositories/recipe_repository.dart';
import '../../services/ai/prompt_execution_service.dart';
import '../widgets/ai_review_gate.dart';

class RecipeBuilderScreen extends ConsumerStatefulWidget {
  final String menuItemId;
  const RecipeBuilderScreen({super.key, required this.menuItemId});

  @override
  ConsumerState<RecipeBuilderScreen> createState() =>
      _RecipeBuilderScreenState();
}

class _RecipeBuilderScreenState
    extends ConsumerState<RecipeBuilderScreen> {
  final List<RecipeIngredientDraft> _ingredients = [];
  double _batchMultiplier = 1.0;
  double _hydrationPct = 0.0;
  bool _showHydration = false;
  int _liveCostCents = 0;

  void _recalcCost() {
    setState(() {
      _liveCostCents = _ingredients.fold(0, (sum, i) {
        return sum + (i.unitCostCents * i.quantity * _batchMultiplier).round();
      });
    });
  }

  void _runCostOptimizer() async {
    final jwt = ref.read(authProvider).jwt;
    final service = ref.read(promptExecutionServiceProvider);
    final result = await service.execute(
      promptName: PromptName.recipeCostOptimizer,
      inputs: {
        'ingredients': _ingredients.map((i) => i.toJson()).toList(),
        'target_food_cost_pct': 32,
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

  @override
  Widget build(BuildContext context) {
    final costDisplay = (_liveCostCents / 100).toStringAsFixed(2);
    return Scaffold(
      appBar: AppBar(
        title: const Text('Recipe Builder'),
        actions: [
          TextButton.icon(
            icon: const Icon(Icons.save),
            label: const Text('Save Version'),
            onPressed: () {},
          ),
        ],
      ),
      body: Column(
        children: [
          Container(
            color: Colors.green.shade50,
            padding:
                const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text('Recipe Cost: \$$costDisplay',
                    style:
                        const TextStyle(fontWeight: FontWeight.bold)),
                Row(
                  children: [
                    const Text('Batch ×'),
                    const SizedBox(width: 8),
                    DropdownButton<double>(
                      value: _batchMultiplier,
                      items: [0.5, 1.0, 1.5, 2.0, 3.0, 4.0]
                          .map((v) => DropdownMenuItem(
                              value: v, child: Text('\${v}x')))
                          .toList(),
                      onChanged: (v) {
                        setState(() => _batchMultiplier = v ?? 1.0);
                        _recalcCost();
                      },
                    ),
                  ],
                ),
              ],
            ),
          ),
          SwitchListTile(
            title: const Text('Hydration Calculator'),
            value: _showHydration,
            onChanged: (v) => setState(() => _showHydration = v),
          ),
          if (_showHydration)
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16),
              child: Row(
                children: [
                  const Text('Hydration %'),
                  Expanded(
                    child: Slider(
                      value: _hydrationPct,
                      min: 0,
                      max: 100,
                      divisions: 100,
                      label: '\${_hydrationPct.round()}%',
                      onChanged: (v) =>
                          setState(() => _hydrationPct = v),
                    ),
                  ),
                  Text('\${_hydrationPct.round()}%'),
                ],
              ),
            ),
          Expanded(
            child: ListView.builder(
              itemCount: _ingredients.length,
              itemBuilder: (_, i) {
                final ing = _ingredients[i];
                return ListTile(
                  title: Text(ing.name),
                  subtitle: Text(
                      '\${(ing.quantity * _batchMultiplier).toStringAsFixed(2)} \${ing.unit}'),
                  trailing: Text(
                      '\$\${((ing.unitCostCents * ing.quantity * _batchMultiplier) / 100).toStringAsFixed(2)}'),
                  leading: IconButton(
                    icon: const Icon(Icons.remove_circle_outline),
                    onPressed: () {
                      setState(() => _ingredients.removeAt(i));
                      _recalcCost();
                    },
                  ),
                );
              },
            ),
          ),
        ],
      ),
      floatingActionButton: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          FloatingActionButton.extended(
            heroTag: 'ai',
            icon: const Icon(Icons.auto_awesome),
            label: const Text('AI Cost Optimizer'),
            onPressed: _runCostOptimizer,
          ),
          const SizedBox(height: 10),
          FloatingActionButton(
            heroTag: 'add',
            child: const Icon(Icons.add),
            onPressed: () {},
          ),
        ],
      ),
    );
  }
}

## 2026-07-24T14:04:27Z
You are an Explorer agent working in directory c:\Users\User\Documents\CulinaryOS\.agents\teamwork_preview_explorer_kds_pos_2.

Objective: Investigate the KDS, POS, Recipe Engine, and Prep Engine implementations across CulinaryOS (c:\Users\User\Documents\CulinaryOS) and KitchenKit (c:\Users\User\Documents\KitchenKit).

Tasks:
1. Examine `apps/kds`, `kds/`, `kds-client/`, and compare with `c:\Users\User\Documents\KitchenKit`. Check station filtering tabs (Hot Grill, Cold Prep, Fryer, Bar, All), 1-second aging timer counters, age alert indicators (Green/Yellow/Red), course hold/fire groupings, and Expo pass view.
2. Examine `@culinaryos/ratio-engine`, `prep-engine`, `recipe-mcp` (`scale_recipe`, `get_ratio`, `list_recipes`, `generate_prep_list`), and `prep-mcp` (`build_shift_prep`, `get_mise_en_place`). Check their exact file locations, exports, implementation status, and tests.
3. Examine `apps/pos`, `pos/`, `pos-client/`. Check implementations of PIN lockscreen, dining room table map, quick orders, seat assignments (Seat 1-4), coupon discounts, and Split Check Wizard (even split & split by seat).
4. Create analysis.md and handoff.md in your working directory `c:\Users\User\Documents\CulinaryOS\.agents\teamwork_preview_explorer_kds_pos_2` detailing current state, missing features, bug locations, and specific implementation recommendations.
5. Send a message to parent with your final handoff.

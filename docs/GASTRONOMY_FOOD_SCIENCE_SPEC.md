# CulinaryOS — Food Science & Modernist Gastronomy Specification

## 1. Executive Overview

CulinaryOS elevates beyond standard restaurant POS and inventory management by incorporating **Modernist Gastronomy and Computational Food Science** directly into its core engine. Built with pure TypeScript and zero runtime dependencies, `@culinaryos/gastronomy-engine` equips operators, research chefs, and culinary technicians with deterministic mathematical models for:

1. **Hydrocolloids & Modernist Texturizers**: Bloom-mass inversion, direct & reverse spherification, agar-agar fluid gel thermal hysteresis, and aeration/espumas.
2. **Thermal Kinetics & Precision Cooking**: Baldwin thermal death time curves, Fourier core heat conduction, USDA/FSIS pathogen reduction ($D$- and $z$-values for *Salmonella*, *Listeria*, and *E. coli*), and egg yolk rheological staging.
3. **Cryo-Gastronomy & Sugar Science**: PAC (Potere Anti-Congelante) and POD (Potere Dolcificante) gelato balancing, total solids ($TS$), milk fat, and refractometer Brix optimization.
4. **Osmotic Equilibrium & Charcuterie Safety**: Closed-system equilibrium brining (EQ brining) and USDA FSIS 9 CFR § 424.21 curing salts (Prague Powder #1 / #2) nitrite PPM safety validation.
5. **Computational Gastronomy & Flavor Pairing**: Shared volatile aroma compound affinity scoring and chemical family resonance.
6. **Emulsion Science & Kinetic Stability**: Hydrophilic-Lipophilic Balance (HLB) matching and steric hindrance stabilization.

---

## 2. Core Mathematical Formulations

### 2.1 Gelatin Bloom-Mass Inversion
Converting gelatin recipes across varying commercial Bloom ratings (Bronze 140, Silver 160, Gold 200, Platinum 250) follows the square-root inversion law:

$$m_2 = m_1 \cdot \sqrt{\frac{B_1}{B_2}}$$

Where $m_1$ is source mass, $B_1$ is source Bloom rating, $B_2$ is target Bloom rating, and $m_2$ is the exact required target mass.

### 2.2 Baldwin Thermal Conduction & Pathogen Inactivation
#### Conduction Heat Penetration Time (Core within 0.5°C of water bath):
$$t_{\text{core}} \approx \frac{d^2}{\pi^2 \alpha} \cdot \gamma \cdot \ln\left( \frac{4 (T_{\text{bath}} - T_{\text{initial}})}{\pi \cdot 0.5} \right)$$
Where $d$ is thickness in mm, $\alpha \approx 1.4 \times 10^{-3} \text{ mm}^2/\text{s}$ is thermal diffusivity, and $\gamma$ is the geometry factor ($1.0$ for slab, $0.52$ for cylinder, $0.35$ for sphere).

#### Pasteurization Hold Time (Baldwin D-value decay):
$$D(T) = D_{60} \cdot 10^{\frac{60 - T}{z}}$$
$$t_{\text{hold}} = D(T) \cdot N_{\text{target\_logs}}$$
- *Salmonella spp.*: $D_{60} = 6.2 \text{ min}$, $z = 5.5^\circ\text{C}$, Target: $6.5D$ (Poultry).
- *Listeria monocytogenes*: $D_{60} = 6.5 \text{ min}$, $z = 7.0^\circ\text{C}$, Target: $6.0D$.
- *E. coli O157:H7*: $D_{60} = 4.5 \text{ min}$, $z = 5.0^\circ\text{C}$, Target: $5.0D$ (Beef).

### 2.3 Gelato Freezing Point Depression (PAC / POD Balance)
- **PAC (Potere Anti-Congelante)**: Freezing point depression index relative to sucrose ($100$):
  - Dextrose: $190$
  - Fructose: $190$
  - Invert Sugar: $190$
  - Pure Ethanol: $330$
  - Glucose DE40: $50$
  - Maltodextrin DE18: $20$
- Optimal Italian artisanal gelato parameters:
  - Total PAC: $26\% - 29\%$ (dipping cabinet at $-11^\circ\text{C}$ to $-12^\circ\text{C}$)
  - Total Solids ($TS$): $36\% - 40\%$
  - Butterfat: $6\% - 9\%$
  - Milk Solids Non-Fat (MSNF): $8.5\% - 10.5\%$

### 2.4 Equilibrium Brining (EQ Brining)
Traditional gradient brining causes surface oversaltiness if soaked past a critical window. Equilibrium brining treats meat and brine as a closed thermodynamic system:
$$m_{\text{salt}} = (m_{\text{protein}} + m_{\text{water}}) \cdot \text{target\_salinity\_pct}$$
The meat can never become saltier than the target percentage regardless of hold duration.

### 2.5 USDA FSIS Curing Salt Nitrite Limit
For Prague Powder #1 ($6.25\% \text{ NaNO}_2$):
$$\text{PPM}_{\text{nitrite}} = \frac{m_{\text{cure}} \cdot 0.0625}{m_{\text{meat}}} \cdot 1,000,000 \le 156 \text{ PPM (comminuted) or } 200 \text{ PPM (immersed)}$$

---

## 3. Architecture & API Endpoints

Mounted under `/v1/gastronomy`:

| Method | Route | Description |
|---|---|---|
| `POST` | `/v1/gastronomy/gelatin/bloom` | Convert gelatin mass across Bloom grades |
| `POST` | `/v1/gastronomy/agar` | Agar-agar fluid gel & cuttable gel formulation |
| `POST` | `/v1/gastronomy/spherification` | Direct, reverse, or frozen reverse spherification |
| `POST` | `/v1/gastronomy/foams` | Lecithin airs and N2O siphon espumas |
| `POST` | `/v1/gastronomy/sous-vide/pasteurize` | Baldwin time-temperature curve & pathogen reduction |
| `POST` | `/v1/gastronomy/sous-vide/egg` | Precision egg yolk rheology stages (onsen, jammy, etc.) |
| `POST` | `/v1/gastronomy/frozen/balance` | Gelato/sorbet PAC, POD, and total solids evaluation |
| `POST` | `/v1/gastronomy/frozen/sorbet-brix` | Fruit purée refractometer Brix balancing with syrup |
| `POST` | `/v1/gastronomy/brining/equilibrium` | Closed-system equilibrium brine formulation |
| `POST` | `/v1/gastronomy/curing/salts` | USDA FSIS Prague Powder #1/#2 calculation & safety gate |
| `POST` | `/v1/gastronomy/flavor/affinity` | Molecular flavor pairing score between 2 ingredients |
| `POST` | `/v1/gastronomy/flavor/pairings` | Top companion volatile aroma matches |
| `POST` | `/v1/gastronomy/emulsions/stability` | HLB calculation and xanthan stabilization |
| `GET` | `/v1/gastronomy/catalog` | Modernist ingredient database & reference charts |

---

## 4. CLI Parity Reference

The `culinary` CLI introduces the `gastronomy` (alias `science`) command:

```bash
# 1. Gelatin Bloom Conversion
culinary gastronomy bloom 12 --from silver --to gold

# 2. Spherification Formulator
culinary gastronomy spherify reverse 500
culinary gastronomy spherify direct 500 --ph 3.8

# 3. Sous-Vide Pasteurization
culinary gastronomy sous-vide poultry_breast 25 63.5

# 4. Sous-Vide Egg Precision Rheology
culinary gastronomy egg 63.5 45

# 5. Modernist Equilibrium Brining
culinary gastronomy brine 1200 800 --salt 1.5 --sugar 0.75

# 6. Molecular Flavor Pairing Affinity
culinary gastronomy pair dark_chocolate blue_cheese
culinary gastronomy pair strawberry --limit 5
```

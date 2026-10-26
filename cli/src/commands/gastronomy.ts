import { Command } from 'commander';
import chalk from 'chalk';
import { table } from 'table';
import { apiGet, apiPost } from '../lib/api-client';

export const gastronomyCommand = new Command('gastronomy')
  .alias('science')
  .description('Modernist Gastronomy & Food Science — Hydrocolloids, Sous-Vide, Spherification & Molecular Flavor Pairing');

// 1. Gelatin Bloom Inversion Conversion
gastronomyCommand
  .command('bloom <massGrams>')
  .description('Convert gelatin weight across Bloom strengths (Bronze, Silver, Gold, Platinum)')
  .option('--from <grade>', 'Source Bloom grade or number', 'silver')
  .option('--to <grade>', 'Target Bloom grade or number', 'gold')
  .option('--tenant <id>', 'Tenant ID')
  .action(async (massGrams, opts) => {
    try {
      const res: any = await apiPost('/v1/gastronomy/gelatin/bloom', {
        massGrams: parseFloat(massGrams),
        fromBloom: isNaN(Number(opts.from)) ? opts.from : Number(opts.from),
        toBloom: isNaN(Number(opts.to)) ? opts.to : Number(opts.to),
      }, opts.tenant);

      const d = res.data;
      console.log(chalk.bold.hex('#F97316')(`\n🍮 Gelatin Bloom Inversion Conversion:\n`));
      const rows = [
        ['Parameter', 'Source Formulation', 'Target Converted'],
        ['Bloom Strength', `${d.sourceBloom} Bloom`, `${d.targetBloom} Bloom`],
        ['Mass Required', `${d.sourceMassGrams}g`, chalk.bold.green(`${d.targetMassGrams}g`)],
        ['Approx. Sheets', `${d.sourceSheetsEstimate} sheets`, `${d.targetSheetsEstimate} sheets`],
      ];
      console.log(table(rows));
    } catch (err: any) {
      console.error(chalk.red(`\n✖ Bloom conversion failed: ${err.message}\n`));
    }
  });

// 2. Spherification Formulator
gastronomyCommand
  .command('spherify <type> <liquidGrams>')
  .description('Formulate direct, reverse, or frozen reverse spherification')
  .option('--ph <number>', 'Liquid base pH level', '5.5')
  .option('--bath <grams>', 'Setting bath water volume in grams', '1000')
  .option('--tenant <id>', 'Tenant ID')
  .action(async (type, liquidGrams, opts) => {
    try {
      const res: any = await apiPost('/v1/gastronomy/spherification', {
        type,
        liquidBaseGrams: parseFloat(liquidGrams),
        basePh: parseFloat(opts.ph),
        settingBathWaterGrams: parseFloat(opts.bath),
      }, opts.tenant);

      const d = res.data;
      console.log(chalk.bold.hex('#F97316')(`\n🔮 Modernist Spherification Formulation (${d.type.toUpperCase()}):\n`));
      const rows = [
        ['Component', 'Formulation Weight', 'Role'],
        ['Base Liquid', `${d.liquidBaseGrams}g`, `Flavor Base (pH ${d.liquidBasePh})`],
        ['Base Alginate', `${d.baseAlginateGrams}g`, 'Sodium Alginate (if direct)'],
        ['Base Calcium', `${d.baseCalciumGrams}g`, 'Calcium Lactate Gluconate (if reverse)'],
        ['Base Xanthan', `${d.baseXanthanGrams}g`, 'Viscosity Stabilizer'],
        ['Buffer Citrate', `${d.sodiumCitrateBufferGrams}g`, 'Acidity Buffer (if pH < 4.5)'],
        ['Bath Water', `${d.settingBathWaterGrams}g`, 'Low-calcium / distilled water'],
        ['Bath Alginate', `${d.bathAlginateGrams}g`, 'Sodium Alginate Setting Bath'],
        ['Bath Calcium', `${d.bathCalciumGrams}g`, 'Calcium Lactate Setting Bath'],
        ['Submersion Time', `${d.submersionTimeSeconds} sec`, 'Ideal Setting Duration'],
      ];
      console.log(table(rows));

      console.log(chalk.bold.cyan('Execution Steps:'));
      d.instructions.forEach((step: string, idx: number) => {
        console.log(chalk.white(` ${idx + 1}. ${step}`));
      });
      console.log('');
    } catch (err: any) {
      console.error(chalk.red(`\n✖ Spherification calculation failed: ${err.message}\n`));
    }
  });

// 3. Sous-Vide Pasteurization & Baldwin Curve
gastronomyCommand
  .command('sous-vide <protein> <thicknessMm> <tempC>')
  .description('Compute Baldwin thermal death time and conduction curve for food-safe sous-vide')
  .option('--initial <tempC>', 'Initial food temperature in °C', '4.0')
  .option('--geometry <type>', 'Geometry: slab, cylinder, or sphere', 'slab')
  .option('--pathogen <type>', 'Pathogen target: salmonella, listeria, or ecoli')
  .option('--tenant <id>', 'Tenant ID')
  .action(async (protein, thicknessMm, tempC, opts) => {
    try {
      const res: any = await apiPost('/v1/gastronomy/sous-vide/pasteurize', {
        protein,
        thicknessMm: parseFloat(thicknessMm),
        bathTempC: parseFloat(tempC),
        initialTempC: parseFloat(opts.initial),
        geometry: opts.geometry,
        targetPathogen: opts.pathogen,
      }, opts.tenant);

      const d = res.data;
      console.log(chalk.bold.hex('#F97316')(`\n♨️  Sous-Vide Baldwin Thermal Pasteurization Curve:\n`));
      const rows = [
        ['Metric', 'Value'],
        ['Protein & Cut', `${d.protein} (${d.geometry})`],
        ['Thickness', `${d.thicknessMm} mm`],
        ['Water Bath Temp', `${d.bathTempC}°C`],
        ['Conduction Time to Core', `${d.timeToCoreMinutes} min`],
        ['Pasteurization Hold Time', `${d.pasteurizationHoldMinutes} min`],
        ['Total Cook Time', chalk.bold.green(`${d.totalCookTimeMinutes} min (${(d.totalCookTimeMinutes / 60).toFixed(1)} hrs)`)],
        ['Pathogen Reduction', `${d.log10Reduction}D log10 (${d.targetPathogen})`],
        ['Safety Clearance', d.isSafe ? chalk.bold.green('✔ SAFE') : chalk.bold.red('✖ DANGER ZONE')],
      ];
      console.log(table(rows));

      if (d.warnings && d.warnings.length > 0) {
        console.log(chalk.bold.yellow('Safety Warnings:'));
        d.warnings.forEach((w: string) => console.log(chalk.yellow(` ⚠️  ${w}`)));
        console.log('');
      }
    } catch (err: any) {
      console.error(chalk.red(`\n✖ Sous-vide calculation failed: ${err.message}\n`));
    }
  });

// 4. Sous-Vide Egg Precision Yolk Stage
gastronomyCommand
  .command('egg <tempC> [minutes]')
  .description('Predict exact yolk rheology and white texture (Onsen, Custard, Jammy, Paste, Hard)')
  .option('--tenant <id>', 'Tenant ID')
  .action(async (tempC, minutes, opts) => {
    try {
      const res: any = await apiPost('/v1/gastronomy/sous-vide/egg', {
        bathTempC: parseFloat(tempC),
        cookMinutes: minutes ? parseFloat(minutes) : 45,
      }, opts.tenant);

      const d = res.data;
      console.log(chalk.bold.hex('#F97316')(`\n🥚 Sous-Vide Egg Precision Rheology:\n`));
      const rows = [
        ['Parameter', 'Result'],
        ['Water Bath Temp', `${d.bathTempC}°C`],
        ['Cook Duration', `${d.cookMinutes} minutes`],
        ['Yolk Stage', chalk.bold.yellow(d.stage.toUpperCase())],
        ['Yolk Viscosity', `${d.yolkViscosityCp} cP`],
        ['Albumen State', d.albumenTexture],
        ['Culinary Application', chalk.cyan(d.culinaryApplication)],
      ];
      console.log(table(rows));
    } catch (err: any) {
      console.error(chalk.red(`\n✖ Egg stage prediction failed: ${err.message}\n`));
    }
  });

// 5. Modernist Equilibrium Brining
gastronomyCommand
  .command('brine <meatGrams> <waterGrams>')
  .description('Calculate closed-system equilibrium brine (never oversalted)')
  .option('--salt <pct>', 'Target finished salinity %', '1.5')
  .option('--sugar <pct>', 'Target finished sweetness %', '0.75')
  .option('--tenant <id>', 'Tenant ID')
  .action(async (meatGrams, waterGrams, opts) => {
    try {
      const res: any = await apiPost('/v1/gastronomy/brining/equilibrium', {
        proteinWeightGrams: parseFloat(meatGrams),
        waterWeightGrams: parseFloat(waterGrams),
        targetSaltPct: parseFloat(opts.salt),
        targetSugarPct: parseFloat(opts.sugar),
      }, opts.tenant);

      const d = res.data;
      console.log(chalk.bold.hex('#F97316')(`\n🧂 Modernist Equilibrium Brining Formula:\n`));
      const rows = [
        ['Component', 'Weight', 'Percentage'],
        ['Protein Mass', `${d.proteinWeightGrams}g`, '—'],
        ['Water Mass', `${d.waterWeightGrams}g`, '—'],
        ['System Total', `${d.totalSystemWeightGrams}g`, '100%'],
        ['Pure Sea Salt', chalk.bold.green(`${d.saltWeightGrams}g`), `${d.targetSaltPct}%`],
        ['Sugar', `${d.sugarWeightGrams}g`, `${d.targetSugarPct}%`],
        ['Min Equilibrium Time', `${d.minCureHours} hours`, 'Osmotic balance'],
      ];
      console.log(table(rows));
    } catch (err: any) {
      console.error(chalk.red(`\n✖ Brine calculation failed: ${err.message}\n`));
    }
  });

// 6. Computational Flavor Pairing & Molecular Affinity
gastronomyCommand
  .command('pair <ingredientA> [ingredientB]')
  .description('Evaluate shared volatile aroma molecules or discover top pairing affinities')
  .option('--limit <count>', 'Max number of companion pairings', '5')
  .option('--tenant <id>', 'Tenant ID')
  .action(async (ingredientA, ingredientB, opts) => {
    try {
      if (ingredientB) {
        const res: any = await apiPost('/v1/gastronomy/flavor/affinity', {
          ingredientA,
          ingredientB,
        }, opts.tenant);

        const d = res.data;
        console.log(chalk.bold.hex('#F97316')(`\n🧬 Molecular Flavor Pairing Affinity:\n`));
        const rows = [
          ['Pairing', `${d.ingredientA} + ${d.ingredientB}`],
          ['Affinity Score', chalk.bold.green(`${d.affinityScore} / 100`)],
          ['Shared Volatiles', d.sharedVolatiles.length > 0 ? d.sharedVolatiles.join(', ') : 'None'],
          ['Chemical Families', d.sharedFamilies.join(', ')],
          ['Synergy Notes', d.synergyNotes],
          ['Recommended Technique', chalk.cyan(d.recommendedTechnique)],
        ];
        console.log(table(rows));
      } else {
        const res: any = await apiPost('/v1/gastronomy/flavor/pairings', {
          ingredient: ingredientA,
          limit: parseInt(opts.limit, 10),
        }, opts.tenant);

        const pairings = res.data;
        console.log(chalk.bold.hex('#F97316')(`\n🧬 Top Companion Flavor Pairings for: ${ingredientA}\n`));
        const rows = [
          ['Rank', 'Companion Ingredient', 'Affinity Score', 'Shared Key Volatiles'],
          ...pairings.map((p: any, idx: number) => [
            String(idx + 1),
            chalk.bold(p.ingredient),
            chalk.green(`${p.score} / 100`),
            p.sharedVolatiles.join(', ') || 'Aroma Family Overlap',
          ]),
        ];
        console.log(table(rows));
      }
    } catch (err: any) {
      console.error(chalk.red(`\n✖ Flavor pairing lookup failed: ${err.message}\n`));
    }
  });

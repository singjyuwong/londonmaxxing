# Prototype: Personalized SAP-like Score

## Goal

Estimate a personalized energy score, similar in spirit to how SAP produces the EPC
rating, but adjusted for how a specific household actually uses the property rather
than the standardized assumptions EPC uses.

## Procedure

1. Start from the property's accurate EPC score, `S` (1-100).
2. Split `S` into three components using SAP's standard weighting:
   - Heating: 65%
   - Hot water: 18%
   - Lighting: 17%

   ```
   H = 0.65 * S
   W = 0.18 * S
   L = 0.17 * S
   ```

3. Apply household-specific adjustment factors to each component to get personalized
   scores `H'`, `W'`, `L'`:

   ```
   H' = H * (F_common_1 * F_common_2 * ... * F_H1 * F_H2 * ...)
   W' = W * (F_common_1 * F_common_2 * ... * F_W1 * F_W2 * ...)
   L' = L * (F_common_1 * F_common_2 * ... * F_L1 * F_L2 * ...)
   ```

4. Sum the adjusted components into the final personalized score:

   ```
   Score' = H' + W' + L'
   ```

## Factors

### Common factors (apply to H, W, and L)

| Factor | Description |
|---|---|
| Occupants | Number of people living in the property |
| Presence | Work-from-home / time spent at home |
| Floor area | Size of the property |

### Heating-only factors

| Factor | Description |
|---|---|
| Insulation | Wall insulation quality |
| Ventilation | Air tightness / ventilation rate |
| Fuel type | Use of gas vs. electricity |
| Temperature preference | Preferred thermostat setting |

### Hot water-only factors

| Factor | Description |
|---|---|
| Shower frequency | Number of showers taken per day/week |
| Shower duration | Average length of each shower |

### Lighting-only factors

| Factor | Description |
|---|---|
| Orientation | Which way the property faces (N, S, E, W) |
| Window-to-wall ratio | Proportion of window area to wall area |

## Prototype assumption

For this first prototype, all factors are set to `1` (i.e. no adjustment), so:

```
Score' = H * 1 + W * 1 + L * 1 = H + W + L = S
```

This gives a baseline implementation that reduces to the original EPC score, ready to
be extended once real factor values/models are defined.

## Implementation

See `sap.ts` for a TypeScript implementation of this model.

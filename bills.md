# Energy Bill Estimator

## Goal

Given a household's *current* energy costs, split into heating, hot water, and
lighting, estimate a *personalized* bill (`H'`, `W'`, `L'`) that reflects how a
specific household actually behaves, rather than assuming they'll continue
exactly as before.

## Inputs

| Input | Description |
|---|---|
| `heating_cost_current` (`H`) | Current heating cost |
| `hot_water_cost_current` (`W`) | Current hot water cost |
| `lighting_cost_current` (`L`) | Current lighting cost |

## Procedure

Each component is adjusted independently by **averaging** (not multiplying) the
factors that apply to it:

```
H' = H * ((f_1 + f_2 + ... + f_n) / n)
W' = W * ((f_1 + f_2 + ... + f_n) / n)
L' = L * ((f_1 + f_2 + ... + f_n) / n)
```

where `n` is the number of factors that apply to that component (see table
below). The final bill estimate is:

```
bill' = H' + W' + L'
```

## Factors

| # | Factor | Applies to | Values |
|---|---|---|---|
| F1 | Heating fuel type | H only | electricity → 2.5, gas → 1 |
| F2 | Number of occupants | H, W, L | 1 person → 0.7, 2 people → 1, 3+ people → 1.25 |
| F3 | Presence at home | H, L (not W) | mostly in office → 0.9, hybrid → 1, WFH → 1.2 (H) / 1.15 (L) |
| F4 | Temperature preference | H only | cool → 0.82, average → 1, warm → 1.15 |
| F5 | Number of rooms heated | H only | whole house → 1, mainly rooms I use → 0.82, just 1-2 rooms → 0.65 |
| F6 | Shower frequency (days/week) | W only | few → 0.75, average → 1, many → 1.35 |

Note that F3 (presence) has two different values depending on whether it's
being applied to heating or lighting — the WFH value is 1.2 for heating and
1.15 for lighting.

### Per-component factor sets

- **H'** (5 factors): F1, F2, F3 (heating value), F4, F5
- **W'** (2 factors): F2, F6
- **L'** (2 factors): F2, F3 (lighting value)

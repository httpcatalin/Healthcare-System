from __future__ import annotations
from typing import List, Dict, Any
import math
try:
	import numpy as np
	HAS_NUMPY = True
except Exception:
	np = None
	HAS_NUMPY = False


def _safe_number(x, default=0.0):
	try:
		v = float(x)
		if math.isnan(v) or math.isinf(v):
			return default
		return v
	except Exception:
		return default


def _build_daily_usage_series(logs: List[dict], days: int = 30):
	from datetime import datetime, timedelta
	end = datetime.utcnow().date()
	start = end - timedelta(days=days - 1)
	dates = [start + timedelta(days=i) for i in range(days)]
	date_index = {d.isoformat(): i for i, d in enumerate(dates)}
	series: Dict[str, Any] = {}
	for log in logs:
		item_id = log.get("itemId")
		ts = log.get("timestamp")
		qty = int(log.get("quantity", 0))
		if not item_id or ts is None:
			continue
		d = ts.date().isoformat() if hasattr(ts, "date") else str(ts)[:10]
		if d not in date_index:
			continue
		idx = date_index[d]
		if item_id not in series:
			if HAS_NUMPY:
				series[item_id] = (np.zeros(days, dtype=float))
			else:
				series[item_id] = [0.0] * days
		if HAS_NUMPY:
			series[item_id][idx] += max(0, qty)
		else:
			series[item_id][idx] = float(series[item_id][idx]) + max(0, qty)
	return series


def _moving_average(x, window: int = 7):
	if HAS_NUMPY:
		if x.size == 0:
			return x
		window = max(1, min(window, x.size))
		cumsum = np.cumsum(np.insert(x, 0, 0.0))
		ma = (cumsum[window:] - cumsum[:-window]) / window
		pad = np.full(x.size - ma.size, ma[0] if ma.size > 0 else 0.0)
		return np.concatenate([pad, ma])
	else:
		n = len(x)
		if n == 0:
			return []
		window = max(1, min(window, n))
		out = []
		for i in range(n):
			start = max(0, i - window + 1)
			sl = x[start : i + 1]
			avg = sum(sl) / max(1, len(sl))
			out.append(avg)
		return out


def _linear_trend(x) -> float:
	if HAS_NUMPY:
		n = x.size
		if n < 2:
			return 0.0
		t = np.arange(n)
		t_mean = t.mean()
		x_mean = x.mean()
		denom = ((t - t_mean) ** 2).sum()
		if denom == 0:
			return 0.0
		slope = ((t - t_mean) * (x - x_mean)).sum() / denom
		return float(slope)
	else:
		n = len(x)
		if n < 2:
			return 0.0
		t = list(range(n))
		t_mean = sum(t) / n
		x_mean = sum(x) / n
		denom = sum((ti - t_mean) ** 2 for ti in t)
		if denom == 0:
			return 0.0
		num = sum((ti - t_mean) * (xi - x_mean) for ti, xi in zip(t, x))
		return float(num / denom)


def forecast_usage(daily_usage, horizon: int = 30):
	if HAS_NUMPY:
		if daily_usage.size == 0:
			return np.zeros(horizon)
		ma = _moving_average(daily_usage, window=min(7, max(1, daily_usage.size)))
		slope = _linear_trend(ma)
		base = ma[-1] if (hasattr(ma, 'size') and ma.size > 0) else daily_usage.mean()
		t = np.arange(1, horizon + 1)
		pred = np.maximum(0.0, base + slope * t)
		ripple = 1.0 + 0.1 * np.sin(2 * np.pi * (t % 7) / 7)
		return np.maximum(0.0, np.round(pred * ripple))
	else:
		if len(daily_usage) == 0:
			return [0.0] * horizon
		ma = _moving_average(daily_usage, window=min(7, max(1, len(daily_usage))))
		slope = _linear_trend(ma)
		base = ma[-1] if len(ma) > 0 else (sum(daily_usage) / max(1, len(daily_usage)))
		preds = []
		for i in range(1, horizon + 1):
			pred = max(0.0, base + slope * i)
			ripple = 1.0 + 0.1 * math.sin(2 * math.pi * (i % 7) / 7)
			preds.append(max(0.0, round(pred * ripple)))
		return preds


def compute_forecasts_and_analytics(items: List[Any], logs: List[Any]) -> tuple[list[dict], dict]:
	raw_logs = [l.model_dump() if hasattr(l, "model_dump") else dict(l) for l in logs]
	usage_map = _build_daily_usage_series(raw_logs, days=30)
	forecasts: list[dict] = []
	total_spend = 0.0
	top_items: list[dict] = []
	category_values: Dict[str, float] = {}
	for item in items:
		item_id = getattr(item, 'id', None)
		name = getattr(item, 'name', 'Unknown')
		current_stock = int(getattr(item, 'currentStock', 0) or 0)
		min_stock = int(getattr(item, 'minStock', 0) or 0)
		price = _safe_number(getattr(item, 'price', 10.0) or 10.0, 10.0)
		category = getattr(item, 'category', None) or 'General'
		total_spend += current_stock * price
		category_values[category] = category_values.get(category, 0.0) + current_stock * price
		usage = usage_map.get(item_id, (np.zeros(30) if HAS_NUMPY else [0.0] * 30))
		pred = forecast_usage(usage, horizon=30)
		remaining = current_stock
		days_until = 30
		for i, u in enumerate(pred):
			remaining -= int(u)
			if remaining <= 0:
				days_until = i + 1
				break
		if HAS_NUMPY:
			avg_daily = float(usage.mean()) if getattr(usage, 'size', 0) > 0 else 0.0
		else:
			avg_daily = (sum(usage) / max(1, len(usage))) if len(usage) > 0 else 0.0
		lead_time = 7
		safety_stock = avg_daily * 3
		reorder_point = int(round(avg_daily * lead_time + safety_stock))
		order_qty = int(max(min_stock * 2, avg_daily * 30))
		if days_until <= 3:
			risk = 'high'
		elif days_until <= 7:
			risk = 'medium'
		else:
			risk = 'low'
		size_val = (getattr(usage, 'size', None) or len(usage)) if not HAS_NUMPY else usage.size
		confidence = float(min(0.95, 0.5 + (size_val / 100)))
		predicted_usage = pred.tolist() if HAS_NUMPY else pred
		forecasts.append({
			'itemId': item_id,
			'itemName': name,
			'currentStock': current_stock,
			'predictedUsage': predicted_usage,
			'daysUntilStockout': int(days_until),
			'recommendedReorderPoint': int(max(0, reorder_point)),
			'recommendedOrderQuantity': int(max(0, order_qty)),
			'confidence': confidence,
			'riskLevel': risk,
		})
		if HAS_NUMPY:
			recent_usage = int(usage[-7:].sum()) if getattr(usage, 'size', 0) >= 7 else int(usage.sum())
		else:
			recent_usage = int(sum(usage[-7:]))
		top_items.append({
			'name': name,
			'totalCost': max(0.0, current_stock * price),
			'usage': max(0, recent_usage),
		})
	top_items.sort(key=lambda x: x['totalCost'], reverse=True)
	top_items = top_items[:5]
	monthly = []
	for i in range(12):
		base = total_spend * 0.8
		seasonal = (math.sin(((i + 1) * math.pi) / 6.0)) * total_spend * 0.2
		monthly.append(float(max(0.0, base + seasonal)))
	total_value = float(max(0.0, total_spend))
	category_breakdown = []
	for cat, val in category_values.items():
		perc = (val / total_value * 100.0) if total_value > 0 else 0.0
		category_breakdown.append({
			'category': cat,
			'items': sum(1 for it in items if (getattr(it, 'category', None) or 'General') == cat),
			'totalValue': float(max(0.0, val)),
			'percentage': float(max(0.0, perc)),
		})
	from datetime import datetime, timedelta
	end = datetime.utcnow().date()
	start = end - timedelta(days=29)
	dates = [start + timedelta(days=i) for i in range(30)]
	trends = []
	for d in dates:
		d_iso = d.isoformat()
		total = 0.0
		categories: Dict[str, float] = {}
		for item in items:
			cat = getattr(item, 'category', None) or 'General'
			u = usage_map.get(getattr(item, 'id'), (np.zeros(30) if HAS_NUMPY else [0.0] * 30))
			idx = (d - start).days
			if HAS_NUMPY:
				length = int(getattr(u, 'size', 0))
			else:
				length = len(u)
			val = float(u[idx]) if 0 <= idx < length else 0.0
			total += val
			categories[cat] = categories.get(cat, 0.0) + val
		trends.append({
			'date': d_iso,
			'totalUsage': float(max(0.0, total)),
			'categories': categories,
		})
	analytics = {
		'totalSpend': total_value,
		'monthlySpend': monthly,
		'topExpensiveItems': top_items,
		'categoryBreakdown': category_breakdown,
		'usageTrends': trends,
	}
	return forecasts, analytics


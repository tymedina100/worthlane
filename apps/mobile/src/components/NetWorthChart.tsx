import { View, Text } from "react-native";
import Svg, { Path, Defs, LinearGradient, Stop, Line } from "react-native-svg";
import { colors, typography } from "@/lib/theme";
import type { NetWorthPoint } from "@worthlane/types";

interface NetWorthChartProps {
  data: NetWorthPoint[];
  width: number;
  height: number;
}

function formatShort(value: number): string {
  if (Math.abs(value) >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
  if (Math.abs(value) >= 1_000) return `$${(value / 1_000).toFixed(0)}K`;
  return `$${value.toFixed(0)}`;
}

export function NetWorthChart({ data, width, height }: NetWorthChartProps) {
  if (data.length < 2) {
    return (
      <View style={{ height, justifyContent: "center", alignItems: "center" }}>
        <Text style={{ ...typography.caption, textAlign: "center" }}>
          Check back tomorrow to see your net worth trend
        </Text>
      </View>
    );
  }

  const padLeft = 4;
  const padRight = 4;
  const padTop = 8;
  const padBottom = 20;
  const chartW = width - padLeft - padRight;
  const chartH = height - padTop - padBottom;

  const values = data.map((d) => d.value);
  const minVal = Math.min(...values);
  const maxVal = Math.max(...values);
  const range = maxVal - minVal || 1;

  const toX = (i: number) => padLeft + (i / (data.length - 1)) * chartW;
  const toY = (v: number) => padTop + (1 - (v - minVal) / range) * chartH;

  // Build SVG path
  const points = data.map((d, i) => ({ x: toX(i), y: toY(d.value) }));
  const linePath = points
    .map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)},${p.y.toFixed(1)}`)
    .join(" ");
  const areaPath =
    linePath +
    ` L${points[points.length - 1].x.toFixed(1)},${(padTop + chartH).toFixed(1)}` +
    ` L${points[0].x.toFixed(1)},${(padTop + chartH).toFixed(1)} Z`;

  const isUp = data[data.length - 1].value >= data[0].value;
  const lineColor = isUp ? colors.primary : colors.danger;
  const gradientId = isUp ? "gradUp" : "gradDown";

  // X-axis labels: start, mid, end
  const startLabel = data[0].date.slice(5); // MM-DD
  const midLabel = data[Math.floor(data.length / 2)].date.slice(5);
  const endLabel = data[data.length - 1].date.slice(5);

  return (
    <View>
      <Svg width={width} height={height}>
        <Defs>
          <LinearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0%" stopColor={lineColor} stopOpacity={0.35} />
            <Stop offset="100%" stopColor={lineColor} stopOpacity={0} />
          </LinearGradient>
        </Defs>

        {/* Area fill */}
        <Path d={areaPath} fill={`url(#${gradientId})`} />

        {/* Line */}
        <Path
          d={linePath}
          fill="none"
          stroke={lineColor}
          strokeWidth={1.5}
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Baseline */}
        <Line
          x1={padLeft}
          y1={padTop + chartH}
          x2={padLeft + chartW}
          y2={padTop + chartH}
          stroke={colors.border}
          strokeWidth={1}
        />
      </Svg>

      {/* X-axis labels */}
      <View style={{ flexDirection: "row", justifyContent: "space-between", paddingHorizontal: padLeft }}>
        <Text style={{ fontSize: 9, color: colors.textDim }}>{startLabel}</Text>
        <Text style={{ fontSize: 9, color: colors.textDim }}>{midLabel}</Text>
        <Text style={{ fontSize: 9, color: colors.textDim }}>{endLabel}</Text>
      </View>

      {/* Min/Max labels */}
      {range > 0 && (
        <View style={{ flexDirection: "row", justifyContent: "space-between", paddingHorizontal: padLeft, marginTop: 2 }}>
          <Text style={{ fontSize: 9, color: colors.textDim }}>{formatShort(minVal)}</Text>
          <Text style={{ fontSize: 9, color: lineColor, fontWeight: "600" }}>{formatShort(maxVal)}</Text>
        </View>
      )}
    </View>
  );
}

import RangeSlider from "./RangeSlider";
import InvestmentControls from "./InvestmentControls";
import { useInvestmentChart } from "./useInvestmentChart";
import { useEffect, useState } from "react";
import * as echarts from "echarts/core";
import { BarChart, PieChart } from "echarts/charts";
import {
  GridComponent,
  LegendComponent,
  TooltipComponent,
} from "echarts/components";
import { CanvasRenderer } from "echarts/renderers";

echarts.use([
  BarChart,
  PieChart,
  GridComponent,
  LegendComponent,
  TooltipComponent,
  CanvasRenderer,
]);

const money = new Intl.NumberFormat("zh-CN", { maximumFractionDigits: 0 });
const signed = (value: number) =>
  `${value > 0 ? "+" : value < 0 ? "−" : ""}¥${money.format(Math.abs(value))}`;

type Key = "firstWeight" | "firstReturn" | "secondWeight" | "secondReturn";
const fields: {
  key: Key;
  label: string;
  min: number;
  max: number;
  step: number;
  unit: string;
}[] = [
  {
    key: "firstWeight",
    label: "持仓 A 占比",
    min: 0,
    max: 100,
    step: 1,
    unit: "%",
  },
  {
    key: "firstReturn",
    label: "持仓 A 涨跌幅",
    min: -100,
    max: 200,
    step: 1,
    unit: "%",
  },
  {
    key: "secondWeight",
    label: "持仓 B 占比",
    min: 0,
    max: 100,
    step: 1,
    unit: "%",
  },
  {
    key: "secondReturn",
    label: "持仓 B 涨跌幅",
    min: -100,
    max: 200,
    step: 1,
    unit: "%",
  },
];

export default function PositionImpact() {
  const { element: chartRef, chart } = useInvestmentChart();
  const { element: profitChartRef, chart: profitChart } = useInvestmentChart();
  const [values, setValues] = useState<Record<Key, string>>({
    firstWeight: "5",
    firstReturn: "100",
    secondWeight: "80",
    secondReturn: "-7",
  });
  const principal = 100000;
  const firstWeight = Number(values.firstWeight);
  const secondWeight = Number(values.secondWeight);
  const validReturns = [values.firstReturn, values.secondReturn].every(
    value =>
      value.trim() !== "" &&
      Number.isFinite(Number(value)) &&
      Number(value) >= -100 &&
      Number(value) <= 200
  );
  const firstReturn = validReturns ? Number(values.firstReturn) : 0;
  const secondReturn = validReturns ? Number(values.secondReturn) : 0;
  const firstProfit = (((principal * firstWeight) / 100) * firstReturn) / 100;
  const secondProfit =
    (((principal * secondWeight) / 100) * secondReturn) / 100;
  const total = firstProfit + secondProfit;
  const cashWeight = 100 - firstWeight - secondWeight;
  const format = (key: Key) => `${values[key]}%`;

  useEffect(() => {
    const render = () => {
      const styles = getComputedStyle(document.documentElement);
      const background = styles.getPropertyValue("--background").trim();
      const foreground = styles.getPropertyValue("--foreground").trim();
      const border = styles.getPropertyValue("--border").trim();
      const accent = styles.getPropertyValue("--accent").trim();
      const secondary = styles.getPropertyValue("--secondary").trim();
      profitChart.current?.setOption(
        {
          tooltip: {
            trigger: "axis",
            backgroundColor: background,
            borderColor: border,
            borderWidth: 1,
            textStyle: { color: foreground },
            extraCssText: "box-shadow: none;",
            valueFormatter: (value: unknown) => signed(Number(value)),
          },
          grid: {
            left: 12,
            right: 16,
            top: 12,
            bottom: 10,
            containLabel: true,
          },
          xAxis: {
            type: "value",
            min: (extent: { min: number; max: number }) =>
              Math.min(0, extent.min) -
              Math.max(Math.abs(extent.min), Math.abs(extent.max), 1) * 0.4,
            max: (extent: { min: number; max: number }) =>
              Math.max(0, extent.max) +
              Math.max(Math.abs(extent.min), Math.abs(extent.max), 1) * 0.4,
            axisLabel: {
              color: foreground,
              formatter: (value: number) => money.format(value),
            },
            splitLine: { lineStyle: { color: border } },
          },
          yAxis: {
            type: "category",
            data: ["持仓 A", "持仓 B", "账户合计"],
            axisLabel: { color: foreground },
            axisLine: { lineStyle: { color: border } },
          },
          series: [
            {
              type: "bar",
              barMaxWidth: 24,
              data: [firstProfit, secondProfit, total].map(value => ({
                value,
                itemStyle: { color: value < 0 ? accent : secondary },
                label: {
                  show: true,
                  position: value < 0 ? "left" : "right",
                  color: foreground,
                  formatter: signed(value),
                  fontSize: 11,
                },
              })),
            },
          ],
        },
        true
      );
    };
    render();
    const observer = new MutationObserver(render);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-theme", "class"],
    });
    return () => observer.disconnect();
  }, [firstProfit, secondProfit, total]);

  useEffect(() => {
    const render = () => {
      const styles = getComputedStyle(document.documentElement);
      const background = styles.getPropertyValue("--background").trim();
      const foreground = styles.getPropertyValue("--foreground").trim();
      const border = styles.getPropertyValue("--border").trim();
      const muted = styles.getPropertyValue("--muted-foreground").trim();
      const accent = styles.getPropertyValue("--accent").trim();
      const secondary = styles.getPropertyValue("--secondary").trim();
      chart.current?.setOption(
        {
          color: [secondary, accent, muted],
          tooltip: {
            trigger: "item",
            formatter: "{b}: {c}%",
            backgroundColor: background,
            borderColor: border,
            borderWidth: 1,
            textStyle: { color: foreground },
            extraCssText: "box-shadow: none;",
          },
          legend: {
            bottom: 0,
            textStyle: { color: foreground },
            selectedMode: false,
          },
          series: [
            {
              type: "pie",
              radius: ["42%", "68%"],
              center: ["50%", "45%"],
              label: { show: true, formatter: "{c}%", color: foreground },
              data: [
                { name: "持仓 A", value: firstWeight },
                { name: "持仓 B", value: secondWeight },
                { name: "现金", value: cashWeight },
              ],
            },
          ],
        },
        true
      );
    };
    render();
    const observer = new MutationObserver(render);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-theme", "class"],
    });
    return () => observer.disconnect();
  }, [firstWeight, secondWeight, cashWeight]);

  return (
    <section
      className="not-prose border-border bg-surface/50 my-8 rounded-md border p-5"
      data-pagefind-ignore
    >
      <h3 className="text-foreground mb-2 font-serif text-lg font-bold">
        仓位如何影响账户盈亏
      </h3>
      <p className="text-muted-foreground mb-4 text-sm leading-relaxed">
        以 10 万元本金为例，调整两只持仓的占比和涨跌幅，看看各自对账户的影响。
      </p>
      <InvestmentControls
        summary={fields.map(field => ({
          label: field.label,
          value: format(field.key),
        }))}
        className="mt-4 gap-4 sm:mt-0 sm:grid sm:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,1fr)] sm:items-start"
      >
        <div className="min-w-0 text-sm">
          <div className="flex flex-wrap justify-between gap-x-2 gap-y-1">
            <span className="text-foreground">持仓比例</span>
            <span className="text-muted-foreground text-xs tabular-nums">
              A {firstWeight}% · B {secondWeight}% · 现金 {cashWeight}%
            </span>
          </div>
          <div className="relative mt-3 h-6">
            <div
              aria-hidden="true"
              className="bg-surface-hover absolute inset-x-2 top-1/2 flex h-2 -translate-y-1/2 overflow-hidden rounded-full"
            >
              <span
                className="bg-secondary"
                style={{ width: `${firstWeight}%` }}
              />
              <span
                className="bg-accent"
                style={{ width: `${secondWeight}%` }}
              />
            </div>
            {(["first", "second"] as const).map(boundary => (
              <RangeSlider
                key={boundary}
                overlay
                min={0}
                max={100}
                step={1}
                value={
                  boundary === "first"
                    ? firstWeight
                    : firstWeight + secondWeight
                }
                aria-label={
                  boundary === "first"
                    ? "持仓 A 与持仓 B 的边界"
                    : "持仓 B 与现金的边界"
                }
                aria-valuetext={
                  boundary === "first"
                    ? `持仓 A ${firstWeight}%，持仓 B ${secondWeight}%`
                    : `持仓 B ${secondWeight}%，现金 ${cashWeight}%`
                }
                onChange={event => {
                  const position = Number(event.target.value);
                  setValues(current => {
                    const first = Number(current.firstWeight);
                    const end = first + Number(current.secondWeight);
                    if (boundary === "first") {
                      const next = Math.min(position, end);
                      return {
                        ...current,
                        firstWeight: String(next),
                        secondWeight: String(end - next),
                      };
                    }
                    return {
                      ...current,
                      secondWeight: String(Math.max(first, position) - first),
                    };
                  });
                }}
              />
            ))}
          </div>
          <p className="text-muted-foreground mt-1 text-xs">
            拖动两个边界调整 A、B 和现金比例
          </p>
        </div>
        {fields
          .filter(field => field.key.endsWith("Return"))
          .map(field => (
            <label
              className="grid min-w-0 content-start gap-2 text-sm"
              key={field.key}
            >
              <span className="text-foreground">{field.label}（%）</span>
              <input
                type="number"
                min={-100}
                max={200}
                step="any"
                value={values[field.key]}
                aria-invalid={
                  values[field.key].trim() === "" ||
                  !Number.isFinite(Number(values[field.key])) ||
                  Number(values[field.key]) < -100 ||
                  Number(values[field.key]) > 200
                }
                onChange={event =>
                  setValues(current => ({
                    ...current,
                    [field.key]: event.target.value,
                  }))
                }
                className="border-border bg-background text-foreground focus-visible:outline-accent w-full rounded-sm border px-3 py-2 text-base tabular-nums focus-visible:outline-2 focus-visible:outline-offset-2 sm:text-sm"
              />
              <span className="text-muted-foreground text-xs">
                −100% 至 200%
              </span>
            </label>
          ))}
      </InvestmentControls>
      {!validReturns && (
        <p role="alert" className="text-accent mt-3 text-sm font-medium">
          请输入 −100% 至 200% 之间的涨跌幅。
        </p>
      )}
      <p className="text-muted-foreground mt-4 text-xs">
        两项仓位合计不超过 100%；其余 {cashWeight}% 视为现金，收益为零。
      </p>
      <div
        ref={chartRef}
        className="mt-2 h-[240px] w-full"
        role="img"
        aria-label={`持仓 A ${firstWeight}%，持仓 B ${secondWeight}%，现金 ${cashWeight}%`}
      />
      <p className="text-foreground mt-4 text-sm font-medium">
        盈亏比较{" "}
        <span className="text-muted-foreground text-xs font-normal">
          （青色为盈利，靛蓝为亏损）
        </span>
      </p>
      <div
        ref={profitChartRef}
        className={`h-[200px] w-full ${validReturns ? "" : "invisible"}`}
        role="img"
        aria-live="polite"
        aria-label={`持仓 A ${signed(firstProfit)}，持仓 B ${signed(secondProfit)}，账户合计 ${signed(total)}`}
      />
      <p className="text-muted-foreground text-xs leading-relaxed">
        账户收益率：
        {validReturns ? ((total / principal) * 100).toFixed(2) : "—"}
        %。示例假设期间没有调仓，不计费用、税费及现金收益。
      </p>
    </section>
  );
}

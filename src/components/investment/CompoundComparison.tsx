import RangeSlider from "./RangeSlider";
import InvestmentControls from "./InvestmentControls";
import { useInvestmentChart } from "./useInvestmentChart";
import { useEffect, useMemo, useState } from "react";
import * as echarts from "echarts/core";
import { LineChart } from "echarts/charts";
import {
  GridComponent,
  TooltipComponent,
  LegendComponent,
} from "echarts/components";
import { CanvasRenderer } from "echarts/renderers";

echarts.use([
  LineChart,
  GridComponent,
  TooltipComponent,
  LegendComponent,
  CanvasRenderer,
]);

const money = new Intl.NumberFormat("zh-CN", { maximumFractionDigits: 0 });
const fields = [
  {
    key: "principal",
    label: "初始本金（元）",
    min: 10000,
    max: 1000000,
    step: 10000,
  },
  { key: "years", label: "投资年数", min: 2, max: 50, step: 2 },
  { key: "rate", label: "平均年收益率（%）", min: -20, max: 30, step: 1 },
  { key: "swing", label: "波动幅度（百分点）", min: 0, max: 60, step: 1 },
] as const;
type Key = (typeof fields)[number]["key"];

export default function CompoundComparison() {
  const [values, setValues] = useState<Record<Key, string>>({
    principal: "100000",
    years: "20",
    rate: "8",
    swing: "30",
  });
  const { element: chartRef, chart } = useInvestmentChart();
  const data = useMemo(() => {
    const { principal, years, rate, swing } = Object.fromEntries(
      Object.entries(values).map(([key, value]) => [key, Number(value)])
    ) as Record<Key, number>;
    if (
      fields.some(
        f =>
          values[f.key].trim() === "" ||
          !Number.isFinite(Number(values[f.key])) ||
          Number(values[f.key]) < f.min ||
          Number(values[f.key]) > f.max
      ) ||
      !Number.isInteger(years) ||
      years % 2 !== 0 ||
      rate - swing < -100
    )
      return null;
    const stable = [principal],
      volatile = [principal];
    for (let year = 1; year <= years; year++) {
      stable.push(stable[year - 1] * (1 + rate / 100));
      volatile.push(
        volatile[year - 1] * (1 + (rate + (year % 2 ? swing : -swing)) / 100)
      );
    }
    return { stable, volatile, years, rate, swing };
  }, [values]);

  useEffect(() => {
    const render = () => {
      if (!chart.current) return;
      if (!data) {
        chart.current.clear();
        return;
      }
      const styles = getComputedStyle(document.documentElement);
      const background = styles.getPropertyValue("--background").trim();
      const foreground = styles.getPropertyValue("--foreground").trim();
      const border = styles.getPropertyValue("--border").trim();
      const accent = styles.getPropertyValue("--accent").trim();
      const secondary = styles.getPropertyValue("--secondary").trim();
      chart.current.setOption(
        {
          color: [secondary, accent],
          textStyle: { color: foreground },
          tooltip: {
            trigger: "axis",
            backgroundColor: background,
            borderColor: border,
            borderWidth: 1,
            textStyle: { color: foreground },
            extraCssText: "box-shadow: none;",
            valueFormatter: (value: unknown) =>
              `¥${money.format(Number(value))}`,
          },
          legend: { top: 0, textStyle: { color: foreground } },
          grid: {
            left: 12,
            right: 16,
            top: 64,
            bottom: 25,
            containLabel: true,
          },
          xAxis: {
            type: "category",
            boundaryGap: false,
            data: Array.from({ length: data.years + 1 }, (_, i) => `${i}年`),
            axisLabel: { color: foreground },
            axisLine: { lineStyle: { color: border } },
          },
          yAxis: {
            type: "value",
            axisLabel: {
              color: foreground,
              formatter: (value: number) => money.format(value),
            },
            splitLine: { lineStyle: { color: border } },
          },
          series: [
            {
              name: "稳定增长",
              type: "line",
              data: data.stable,
              showSymbol: false,
            },
            {
              name: "波动增长",
              type: "line",
              data: data.volatile,
              showSymbol: false,
              lineStyle: { type: "dashed" },
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
  }, [data]);

  return (
    <section
      className="not-prose border-border bg-surface/50 my-8 rounded-md border p-5"
      data-pagefind-ignore
    >
      <h3 className="text-foreground mb-2 font-serif text-lg font-bold">
        看看波动如何影响复利
      </h3>
      <p className="text-muted-foreground mb-4 text-sm leading-relaxed">
        两种路径的平均年收益率相同：稳定增长；或每年交替上涨和下跌。
      </p>
      <InvestmentControls
        summary={fields.map(field => ({
          label: field.label,
          value:
            field.key === "principal"
              ? `¥${money.format(Number(values[field.key]))}`
              : values[field.key],
        }))}
        className="mt-4 grid-cols-2 gap-x-6 gap-y-5 max-[400px]:grid-cols-1 sm:mt-0 sm:grid"
      >
        {fields.map(field => (
          <label className="grid gap-2 text-sm" key={field.key}>
            <span className="flex items-baseline justify-between gap-2">
              <span className="text-foreground">{field.label}</span>
              <span className="text-muted-foreground tabular-nums">
                {field.key === "principal"
                  ? `¥${money.format(Number(values[field.key]))}`
                  : values[field.key]}
              </span>
            </span>
            <RangeSlider
              min={field.min}
              max={field.max}
              step={field.step}
              value={values[field.key]}
              aria-valuetext={
                field.key === "principal"
                  ? `${money.format(Number(values[field.key]))}元`
                  : undefined
              }
              onChange={e =>
                setValues({ ...values, [field.key]: e.target.value })
              }
            />
            <span
              aria-hidden="true"
              className="text-muted-foreground flex justify-between text-xs tabular-nums"
            >
              <span>
                {field.key === "principal"
                  ? money.format(field.min)
                  : field.min}
              </span>
              <span>
                {field.key === "principal"
                  ? money.format(field.max)
                  : field.max}
              </span>
            </span>
          </label>
        ))}
      </InvestmentControls>
      <p
        className="text-accent mt-3 mb-4 text-sm font-medium empty:hidden"
        role="status"
      >
        {!data &&
          "请输入有效数值：年数须为 2 至 50 的偶数，最低年度收益率不能低于 -100%。"}
      </p>
      {data && (
        <div
          className="my-5 grid grid-cols-3 gap-2 sm:gap-3"
          aria-live="polite"
        >
          <div className="border-border bg-background grid min-w-0 content-start gap-1 rounded-sm border p-2.5 text-xs sm:p-3 sm:text-[0.8125rem]">
            <span className="text-secondary min-h-8 font-medium sm:min-h-0">
              稳定增长<span className="hidden sm:inline"> · </span>
              <span className="block text-[0.625rem] whitespace-nowrap sm:inline sm:text-inherit">
                每年 {data.rate}%
              </span>
            </span>
            <strong className="text-foreground text-sm break-all tabular-nums sm:text-[1.0625rem]">
              ¥{money.format(data.stable[data.years])}
            </strong>
          </div>
          <div className="border-border bg-background grid min-w-0 content-start gap-1 rounded-sm border p-2.5 text-xs sm:p-3 sm:text-[0.8125rem]">
            <span className="text-accent min-h-8 font-medium sm:min-h-0">
              波动增长<span className="hidden sm:inline"> · </span>
              <span className="block text-[0.625rem] whitespace-nowrap sm:inline sm:text-inherit">
                交替 {data.rate + data.swing}% / {data.rate - data.swing}%
              </span>
            </span>
            <strong className="text-foreground text-sm break-all tabular-nums sm:text-[1.0625rem]">
              ¥{money.format(data.volatile[data.years])}
            </strong>
          </div>
          <div className="border-border bg-background grid min-w-0 content-start gap-1 rounded-sm border p-2.5 text-xs sm:p-3 sm:text-[0.8125rem]">
            <span className="text-muted-foreground min-h-8 sm:min-h-0">
              期末差额
            </span>
            <strong className="text-foreground text-sm break-all tabular-nums sm:text-[1.0625rem]">
              ¥
              {money.format(
                data.stable[data.years] - data.volatile[data.years]
              )}
            </strong>
          </div>
        </div>
      )}
      <div
        ref={chartRef}
        className="mt-5 h-[300px] w-full"
        role="img"
        aria-label="两种收益路径的资产变化曲线；具体期末金额显示在上方"
      />
      <p className="text-muted-foreground mt-4 text-xs leading-relaxed">
        示例假设收益每年再投入，无追加资金、费用或税费。波动路径先涨后跌，年数为偶数，确保两种路径的算术平均年收益率一致；实际收益不会按固定规律变化。
      </p>
    </section>
  );
}

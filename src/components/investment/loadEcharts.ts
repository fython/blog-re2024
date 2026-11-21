type EChartsCore = typeof import("echarts/core");

let loader: Promise<EChartsCore> | undefined;

/**
 * Lazily loads ECharts modules on the client so SSR avoids importing ECharts.
 */
export function loadEcharts(): Promise<EChartsCore> {
  loader ??= Promise.all([
    import("echarts/core"),
    import("echarts/charts"),
    import("echarts/components"),
    import("echarts/renderers"),
  ])
    .then(
      ([
        echarts,
        { BarChart, LineChart, PieChart },
        { GridComponent, LegendComponent, TooltipComponent },
        { CanvasRenderer },
      ]) => {
        echarts.use([
          BarChart,
          LineChart,
          PieChart,
          GridComponent,
          LegendComponent,
          TooltipComponent,
          CanvasRenderer,
        ]);
        return echarts;
      }
    )
    .catch(error => {
      loader = undefined;
      throw error;
    });

  return loader;
}

type EChartsCore = typeof import("echarts/core");

let loader: Promise<EChartsCore> | undefined;

/**
 * Lazily loads ECharts modules on the client so SSR avoids importing ECharts.
 */
export function loadEcharts(): Promise<EChartsCore> {
  loader ??= import("./echartsClient")
    .then(({ echarts }) => echarts)
    .catch(error => {
      loader = undefined;
      throw error;
    });

  return loader;
}

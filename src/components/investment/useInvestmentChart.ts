import { useEffect, useRef, useState } from "react";
import type { ECharts } from "echarts/core";
import { loadEcharts } from "./loadEcharts";

export function useInvestmentChart() {
  const element = useRef<HTMLDivElement>(null);
  const chart = useRef<ECharts | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!element.current) return;

    let disposed = false;
    let instance: ECharts | null = null;
    let resize: ResizeObserver | null = null;

    void loadEcharts().then(echarts => {
      if (disposed || !element.current) return;
      instance = echarts.init(element.current);
      chart.current = instance;
      resize = new ResizeObserver(() => instance?.resize());
      resize.observe(element.current);
      setReady(true);
    });

    return () => {
      disposed = true;
      resize?.disconnect();
      instance?.dispose();
      chart.current = null;
      setReady(false);
    };
  }, []);

  return { element, chart, ready };
}

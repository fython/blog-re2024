import { useEffect, useRef } from "react";
import * as echarts from "echarts/core";

export function useInvestmentChart() {
  const element = useRef<HTMLDivElement>(null);
  const chart = useRef<echarts.ECharts | null>(null);
  useEffect(() => {
    if (!element.current) return;
    const instance = echarts.init(element.current);
    chart.current = instance;
    const resize = new ResizeObserver(() => instance.resize());
    resize.observe(element.current);
    return () => {
      resize.disconnect();
      instance.dispose();
      chart.current = null;
    };
  }, []);
  return { element, chart };
}

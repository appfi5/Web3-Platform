import numbro from 'numbro';

type Value = string | number | undefined | null;
type FormatOptions = {
  mantissa?: number;
  trimMantissa?: boolean;
  thousandSeparated?: boolean;
  postfix?: string;
  prefix?: string;
  average?: boolean;
};

export function formatNumber(value: Value, options: FormatOptions = {}) {
  if (value == null || Number.isNaN(Number(value))) {
    return '-';
  }

  const formatOptions = mergeWithDefaultFormatOptions(value, options);
  return numbro(value).format(formatOptions).toLocaleUpperCase();
}

export function formatCurrency(value: Value, options: FormatOptions = {}) {
  if (value == null || Number.isNaN(Number(value)) || !value) {
    return '-';
  }

  const formatOptions = mergeWithDefaultFormatOptions(value, options);
  return numbro(value).formatCurrency(formatOptions).toUpperCase();
}

function mergeWithDefaultFormatOptions(value: string | number, options: FormatOptions): FormatOptions {
  const { mantissa, trimMantissa, ...rest } = options;
  const defaultMantissa =
    Number(value) > 1 ? 2 : Number(value) === 0 ? 0 : Math.max(0, -Math.floor(Math.log10(Math.abs(Number(value))))) + 3;

  if (Number(value) < 1) {
    return { mantissa: mantissa ?? defaultMantissa, trimMantissa: trimMantissa ?? true, ...rest };
  }

  return {
    mantissa: mantissa ?? defaultMantissa,
    trimMantissa: trimMantissa ?? true,
    thousandSeparated: true,
    ...rest,
  };
}

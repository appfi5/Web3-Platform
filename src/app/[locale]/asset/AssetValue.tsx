export const AssetValue = ({ value }: { value: string }) => {
  if (!value) {
    return null;
  }

  const [integer, decimal] = value.split('.');

  const formattedDecimal = formatDecimal(decimal);

  return (
    <>
      {formatInteger(integer)}
      {formattedDecimal ? '.' : ''}
      <span>{formatDecimal(decimal)}</span>
    </>
  );
};

const INTEGER_FORMATTER = Intl.NumberFormat('en-US', {
  style: 'decimal',
});
function formatInteger(value?: string): string {
  // @ts-expect-error Intl supports string but the dts is wrong
  return INTEGER_FORMATTER.format(value);
}

const DECIMAL_TAIL_MATCHER = /0+$/;

function formatDecimal(value?: string): string {
  // remove tail zeros
  return value?.replace(DECIMAL_TAIL_MATCHER, '') ?? '';
}

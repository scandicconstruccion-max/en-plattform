// Formaterer tall med mellomrom for tusen-separering
export const formatNumber = (number) => {
  if (number === null || number === undefined || isNaN(number)) return '0';
  return Math.round(number).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
};

// Formaterer beløp med "Kr" suffix
export const formatAmount = (amount) => {
  return `${formatNumber(amount)} Kr`;
};
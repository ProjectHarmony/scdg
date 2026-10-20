export function mapPlayer(row) {
  return {
    ...row,
    isActive: Boolean(row.is_active),
  };
}

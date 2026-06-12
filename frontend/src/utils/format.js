import { ethers } from "ethers";

export const ZERO_ADDRESS = ethers.ZeroAddress;

export function shortAddress(address) {
  if (!address) return "Chưa kết nối";
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

export function formatEth(value) {
  if (!value) return "0";
  return Number(ethers.formatEther(value)).toLocaleString("en-US", {
    maximumFractionDigits: 4,
  });
}

export function formatUnixDate(timestamp) {
  if (!timestamp) return "-";
  return new Date(timestamp * 1000).toLocaleString("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

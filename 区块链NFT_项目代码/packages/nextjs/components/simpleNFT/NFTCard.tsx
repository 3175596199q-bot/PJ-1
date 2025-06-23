"use client";
import { useState, useEffect } from "react";
import { Address, AddressInput } from "../scaffold-eth";
import { Collectible } from "./MyHoldings";
import { useScaffoldContractWrite } from "~~/hooks/scaffold-eth";
import { wrapInTryCatch } from "~~/utils/scaffold-eth/common";
import { useAccount } from "wagmi";

interface NFTCardProps {
  nft: Collectible;
  onTransferSuccess: (id: number) => void;
}

export const NFTCard = ({ nft, onTransferSuccess }: NFTCardProps) => {
  const [transferToAddress, setTransferToAddress] = useState("");
  const [imageURL, setImageURL] = useState(nft.image);
  const [nftDetails, setNftDetails] = useState<Collectible>(nft);

  const { address: connectedAddress } = useAccount();

  const { writeAsync: _transfer } = useScaffoldContractWrite({
    contractName: "YourCollectible",
    functionName: "_transfer",
    args: [connectedAddress, transferToAddress, true],
  });

  const { writeAsync: transferNFT } = useScaffoldContractWrite({
    contractName: "YourCollectible",
    functionName: "transferFrom",
    args: [nft.owner, transferToAddress, BigInt(nft.tokenId || nft.id)],
  });

  const broadcastChannel = new BroadcastChannel('nft_channel');

  // 更新状态时监听 `nft` 变化
  useEffect(() => {
    setNftDetails(nft);
    setImageURL(nft.image); // 确保 `imageURL` 始终反映最新的 `nft` 数据
  }, [nft]);

  const handleTransfer = async () => {
    if (connectedAddress !== nft.owner) {
      await _transfer();
    }
    await transferNFT();
    onTransferSuccess(nft.id); // 在转移成功后调用此函数来移除卡片

    // 从本地存储中删除该 NFT
    const storedNFTs = JSON.parse(localStorage.getItem("createdNFTs") || "[]");
    const updatedNFTs = storedNFTs.filter((item: Collectible) => item.id !== nft.id);
    localStorage.setItem("createdNFTs", JSON.stringify(updatedNFTs));

    // 将 NFT 数据添加到目标地址的本地存储
    const newNFT = { ...nftDetails, owner: transferToAddress };
    localStorage.setItem("createdNFTs", JSON.stringify([...updatedNFTs, newNFT]));

    // 通过 BroadcastChannel 发送数据
    broadcastChannel.postMessage(newNFT);
  };

  return (
    <div className="card card-compact bg-base-100 shadow-lg sm:min-w-[300px] shadow-secondary">
      <figure className="relative">
        <img src={imageURL || nft.image} alt="NFT Image" className="h-60 min-w-full" />
        <figcaption className="glass absolute bottom-4 left-4 p-4 w-25 rounded-xl">
          <span className="text-white"># {nft.id}</span>
        </figcaption>
      </figure>
      <div className="card-body space-y-3">
        <div className="flex items-center justify-center">
          <p className="text-xl p-0 m-0 font-semibold">{nftDetails.name}</p>
          <div className="flex flex-wrap space-x-2 mt-1">
            {nftDetails.attributes?.map((attr, index) => (
              <span key={index} className="badge badge-primary py-3">
                {attr.trait_type}: {attr.value}
              </span>
            ))}
          </div>
        </div>
        <div className="flex flex-col justify-center mt-1">
          <p className="my-0 text-lg">{nftDetails.description}</p>
        </div>
        <div className="flex space-x-3 mt-1 items-center">
          <span className="text-lg font-semibold">Owner : </span>
          <Address address={nftDetails.owner} />
        </div>
        {nftDetails.CID && (
          <div className="flex space-x-3 mt-1 items-center">
            <span className="text-lg font-semibold">CID : </span>
            <span>{nftDetails.CID}</span>
          </div>
        )}
        <div className="flex flex-col my-2 space-y-1">
          <span className="text-lg font-semibold mb-1">Transfer To: </span>
          <AddressInput
            value={transferToAddress}
            placeholder="receiver address"
            onChange={(newValue) => setTransferToAddress(newValue)}
          />
        </div>
        <div className="card-actions justify-end">
          <button
            className="btn btn-secondary btn-md px-8 tracking-wide"
            onClick={handleTransfer}
            style={{ margin: "0px auto" }}
          >
            发送
          </button>
        </div>
      </div>
    </div>
  );
};

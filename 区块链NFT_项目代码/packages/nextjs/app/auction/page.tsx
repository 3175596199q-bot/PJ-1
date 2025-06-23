"use client";

import { useEffect, useState, useRef } from "react";
import { NFTCard } from "~~/components/simpleNFT"; // 假设 NFTCard 组件已经处理了 NFT 的展示
import { useScaffoldContract, useScaffoldContractRead, useScaffoldContractWrite } from "~~/hooks/scaffold-eth";
import { useAccount } from "wagmi";
import { message, Button, Input } from "antd";

const AuctionPage = () => {
  const { address: connectedAddress } = useAccount();
  const [myAllCollectibles, setMyAllCollectibles] = useState<any[]>([]); // 存储所有相关的 NFT 数据
  const [auctions, setAuctions] = useState<any[]>([]); // 存储所有拍卖信息
  const [auctionIds, setAuctionIds] = useState<any[]>([]); // 存储拍卖的 NFT ID 列表
  const [isLoading, setIsLoading] = useState(true); // 加载状态
  const [bidAmount, setBidAmount] = useState<string>(""); // 用户输入的出价金额

  const { data: yourCollectibleContract } = useScaffoldContract({
    contractName: "YourCollectible",
  });

  const { data: tokenIdCounter } = useScaffoldContractRead({
    contractName: "YourCollectible",
    functionName: "tokenIdCounter",
    watch: true,
    cacheOnBlock: true,
  });

  const { write: placeBid } = useScaffoldContractWrite({
    contractName: "YourCollectible",
    functionName: "bid",
    args: [0], // tokenId 会动态传递
    value: BigInt(0),  // 出价金额会动态传递
  });

  // 获取拍卖信息
  useEffect(() => {
    const fetchAuctionData = async () => {
      if (!yourCollectibleContract || !tokenIdCounter) return;

      const auctionData: any[] = [];
      const auctionIdList: any[] = [];
      for (let id = 1; id <= Number(tokenIdCounter); id++) {
        try {
          const auctionInfo = await yourCollectibleContract.read.getAuctions([id]);

          // 只筛选正在进行拍卖的 NFT
          if (auctionInfo && auctionInfo.isActive) {
            auctionData.push({
              tokenId: id,
              minBid: auctionInfo.minBid.toString(),
              highestBid: auctionInfo.highestBid.toString(),
              highestBidder: auctionInfo.highestBidder,
              seller: auctionInfo.seller,
              endTime: Number(auctionInfo.endTime) * 1000,  // 转换为毫秒
              history: auctionInfo.history || [],
              isActive: auctionInfo.isActive,
            });
            auctionIdList.push(id); // 存储拍卖 ID
          }
        } catch (e) {
          console.log(e);
        }
      }
      setAuctions(auctionData);
      setAuctionIds(auctionIdList); // 设置拍卖的 NFT ID 列表
    };

    fetchAuctionData();
  }, [yourCollectibleContract, tokenIdCounter]);

  // 获取拍卖 NFT 数据
  useEffect(() => {
    const updateAuctionNFTs = async (): Promise<void> => {
      if (auctionIds.length === 0 || !yourCollectibleContract || connectedAddress === undefined) return;

      setIsLoading(true);
      const collectibleUpdate: any[] = [];

      const storedNFTs = localStorage.getItem("createdNFTs");

      let userNFTs: any[] = [];
      if (storedNFTs) {
        userNFTs = JSON.parse(storedNFTs);
      }

      // 只处理属于拍卖中的 NFT
      for (let tokenId of auctionIds) {
        try {
          const tokenURI = await yourCollectibleContract.read.tokenURI([tokenId]);  // 获取 NFT 的 URI
          const localNFT = userNFTs.find((nft: any) => nft.id === tokenId);

          if (localNFT) {
            collectibleUpdate.push({
              ...localNFT,
              uri: tokenURI,
              tokenId,
            });
          }
        } catch (e) {
          console.log(e);
        }
      }

      // 排序 NFT
      collectibleUpdate.sort((a, b) => a.tokenId - b.tokenId);
      setMyAllCollectibles(collectibleUpdate);
      setIsLoading(false);
    };

    updateAuctionNFTs();
  }, [auctionIds, yourCollectibleContract, connectedAddress]);

  // 自动结束拍卖
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (auctions.length === 0 || timerRef.current) return; // 如果 auctions 为空或定时器已经存在则不再设置

    console.log("Starting auction check..."); // 确认定时器已启动

    timerRef.current = setInterval(() => {
      const now = Date.now();

      // 遍历拍卖项
      auctions.forEach(async (auction) => {
        console.log("Auction data:", auction); // 确保能打印出拍卖数据
        console.log(`Current time: ${now}, Auction end time: ${auction.endTime}`); // 打印当前时间和结束时间

        // 检查拍卖是否应该结束
        if (now >= auction.endTime && auction.isActive) {
          console.log(`Ending auction ${auction.tokenId}`); // 打印拍卖结束的日志

          try {
            await yourCollectibleContract.write.endAuction([auction.tokenId]);
            message.success(`拍卖 ${auction.tokenId} 已结束！`);
          } catch (error) {
            console.error("结束拍卖失败:", error);
            message.error(`结束拍卖 ${auction.tokenId} 失败: ${error.message}`);
          }
        }
      });
    }, 60000); // 每分钟检查一次

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [auctions]); // 依赖 auctions 更新

  // 显示 NFT 和拍卖信息
  const renderAuctionItems = () => {
    return myAllCollectibles.map((nft) => {
      const auction = auctions.find((auction) => auction.tokenId === nft.tokenId); // 查找该 NFT 对应的拍卖信息
      return (
        <div key={nft.tokenId} className="flex flex-col items-center gap-4 p-4 border rounded-lg">
          <div className="text-center">
            <h3 className="text-xl font-semibold">NFT #{nft.tokenId}</h3>
            <p className="text-md font-medium">作者: {auction.seller}</p>

            <img src={nft.image} alt={`NFT #${nft.tokenId}`} className="w-48 h-48 object-cover rounded-lg" />
          </div>

          {auction ? (
            <div className="text-center mt-4">
              <p className="text-md font-medium">起拍价: {auction.minBid} ETH</p>
              <p className="text-md font-medium">最高出价: {auction.highestBid} Wei</p>
              <p className="text-md font-medium">最高出价买家: {auction.highestBidder}</p>
              <p className="text-md">结束时间: {new Date(auction.endTime).toLocaleString()}</p>
              <p className="text-sm text-gray-500">拍卖历史: {auction.history.length} 次竞标</p>
              {auction.highestBidder !== connectedAddress && auction.seller !== connectedAddress &&(
                <div className="mt-4">
                  <Input
                    value={bidAmount}
                    onChange={(e) => setBidAmount(e.target.value)}
                    placeholder="输入出价金额"
                    className="w-full mb-2"
                    type="number"
                  />
                  <Button
                    type="primary"
                    onClick={() => handleBid(nft.tokenId)}
                    disabled={auction.endTime <= Date.now() || !bidAmount || parseFloat(bidAmount) * 10 ** 18 <= parseFloat(auction.highestBid)}
                  >
                    出价
                  </Button>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center mt-4 text-red-500">该NFT没有参与任何拍卖</div>
          )}
        </div>
      );
    });
  };

  // 处理出价
  const handleBid = async (tokenId: number) => {
    try {
      const bidAmountInWei = parseFloat(bidAmount) * 10 ** 18; // 将 ETH 转换为 Wei
      await placeBid({ args: [tokenId], value: BigInt(bidAmountInWei) });
      message.success("出价成功！");
      setBidAmount(""); // 清空输入框
    } catch (error) {
      console.error("出价失败:", error);
      message.error("出价失败，请重试！");
    }
  };

  return (
    <div>
      {myAllCollectibles.length === 0 ? (
        <div className="flex justify-center items-center mt-10">
          <div className="text-lg">没有拍卖中的NFT</div>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-8">{renderAuctionItems()}</div>
      )}
    </div>
  );
};

export default AuctionPage;

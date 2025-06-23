"use client";

import { useState, useEffect } from "react";
import { useAccount } from "wagmi";
import { Modal, Button, notification, Input } from "antd";
import { Address } from "~~/components/scaffold-eth";
import { useScaffoldContractWrite, useScaffoldContractRead } from "~~/hooks/scaffold-eth";
import { ethers } from "ethers";
import Link from "next/link";
import { useRouter } from "next/router";  // 导入 useRouter

// 定义NFT数据接口
interface Collectible {
  image: string;
  id: number;
  name: string;
  attributes: { trait_type: string; value: string }[];
  owner: string;
  description: string;
  CID: string;
}

// 定义在售NFT数据接口
interface ListedNftInfo {
  id: number;
  price: string;
}

// 定义交易历史数据接口
interface TransactionHistory {
  seller: string;
  buyer: string;
  price: string;
  timestamp: string;
}

const NFTDetailPage = ({ params }) => {
  const { address: connectedAddress } = useAccount();
  const [allNFTs, setAllNFTs] = useState<Collectible[]>([]);
  const [listedNFTs, setListedNFTs] = useState<ListedNftInfo[]>([]);
  const [selectedNft, setSelectedNft] = useState<Collectible | null>(null);
  const [buyerAddresses, setBuyerAddresses] = useState<{ [key: number]: string }>({});
  const [transactionHistory, setTransactionHistory] = useState<TransactionHistory[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const itemsPerPage = 6;

  const { writeAsync: purchase } = useScaffoldContractWrite({
    contractName: "YourCollectible",
    functionName: "purchase",
    args: [0n, "", "", 0n, 0n], // 初始默认参数
  });

  // 获取 NFT 交易历史
  const { data: historyData } = useScaffoldContractRead({
    contractName: "YourCollectible",
    functionName: "getTransactionHistory", // 合约自动生成的 getter 函数
    args: [params.id], // 传入 tokenId
  });

  // 获取并存储所有NFT数据
  useEffect(() => {
    const storedAllNFTs = localStorage.getItem("allNFTs");
    const storedListedNFTs = localStorage.getItem("listedNFTs");
    if (storedAllNFTs) {
      const nfts = JSON.parse(storedAllNFTs);
      setAllNFTs(nfts);
    }
    if (storedListedNFTs) {
      const listed = JSON.parse(storedListedNFTs);
      setListedNFTs(listed);
    }
  }, []);

  // 更新交易历史数据
  useEffect(() => {
    if (historyData) {
      const history = historyData.map((tx: any) => ({
        seller: tx.seller,
        buyer: tx.buyer,
        price: Number(tx.price).toString(), // 转换为 ETH
        timestamp: new Date(Number(tx.timestamp) * 1000).toLocaleString(), // 转换为时间字符串
      }));
      setTransactionHistory(history);
    }
  }, [historyData]);

  // 查找NFT并设置为选中
  useEffect(() => {
    const nft = allNFTs.find((nft) => nft.id === parseInt(params.id));
    if (nft) setSelectedNft(nft);
  }, [params.id, allNFTs]);

  // 处理购买操作
  const handlePurchase = async () => {
    if (!selectedNft || !buyerAddresses[selectedNft.id]) return;

    try {
      const price = ethers.parseUnits(
        getPriceById(selectedNft.id),
        "ether"
      ); // 转换为wei
      await purchase({
        args: [
          BigInt(selectedNft.id),
          selectedNft.owner,
          buyerAddresses[selectedNft.id],
          price,
          BigInt(1),
        ],
        value: price,
      });

      notification.success({ message: "购买成功" });

      // 删除NFT信息
      const updatedAllNFTs = allNFTs.filter((nft) => nft.id !== selectedNft.id);
      setAllNFTs(updatedAllNFTs);
      localStorage.setItem("allNFTs", JSON.stringify(updatedAllNFTs));

      const updatedListedNFTs = listedNFTs.filter((nft) => nft.id !== selectedNft.id);
      setListedNFTs(updatedListedNFTs);
      localStorage.setItem("listedNFTs", JSON.stringify(updatedListedNFTs));

      // 更新NFT的owner信息
      const storedCreatedNFTs = localStorage.getItem("createdNFTs");
      const createdNFTs = storedCreatedNFTs ? JSON.parse(storedCreatedNFTs) : [];
      const updatedCreatedNFTs = createdNFTs.map((nft: Collectible) =>
        nft.id === selectedNft.id && nft.owner === selectedNft.owner
          ? { ...nft, owner: buyerAddresses[selectedNft.id] }
          : nft
      );
      localStorage.setItem("createdNFTs", JSON.stringify(updatedCreatedNFTs));

      setIsModalOpen(false);
    } catch (error) {
      console.error(error);
      notification.error({ message: "购买失败" });
    }
  };

  // 获取价格
  const getPriceById = (id: number) => {
    const listedNft = listedNFTs.find((nft) => nft.id === id);
    return listedNft ? listedNft.price : "N/A";
  };

  // 更新买家地址
  const handleBuyerAddressChange = (id: number, address: string) => {
    setBuyerAddresses((prevAddresses) => ({
      ...prevAddresses,
      [id]: address,
    }));
  };

  // 返回上一页
  // const router = useRouter();
  // const handleBack = () => {
  //   router.back();
  // };

  return (
    <div className="container mx-auto px-4">
      {selectedNft && (
        <>
          {/* 返回按钮 */}
          <Link href={`/allNFTs`} passHref>
          <Button
            type="link"
            // onClick={handleBack}
            className="absolute top-4 left-4 z-10 text-lg font-semibold"
          >
            &#8592; 返回
          </Button>
          </Link>

          {/* 商品展示区 */}
          <div className="flex items-start flex-col lg:flex-row pt-10">
            {/* 商品图片 */}
            <div className="w-full lg:w-1/2 mb-6 lg:mb-0">
              <img
                src={selectedNft.image}
                alt="NFT Image"
                className="w-full h-auto rounded-lg shadow-lg"
              />
            </div>

            {/* 商品信息 */}
            <div className="w-full lg:w-1/2 ml-0 lg:ml-6">
              <h1 className="text-3xl font-semibold text-gray-900">{selectedNft.name}</h1>
              <div className="my-3 text-lg font-medium text-gray-700">
                <span className="text-2xl font-bold">¥ {getPriceById(selectedNft.id)} ETH</span>
              </div>
              <div className="text-gray-600 mb-6">
                <p>{selectedNft.description}</p>
              </div>
              <div className="my-4">
                <span className="text-lg font-semibold">卖家: </span>
                <Address address={selectedNft.owner} />
              </div>
              <div className="flex flex-col my-3">
                <span className="text-lg font-semibold mb-2">您的购买地址：</span>
                <Input
                  type="text"
                  placeholder="请输入您的账户地址"
                  className="input input-bordered w-full"
                  value={buyerAddresses[selectedNft.id] || ""}
                  onChange={(e) => handleBuyerAddressChange(selectedNft.id, e.target.value)}
                />
              </div>
              <Button
                type="primary"
                className="btn btn-block btn-lg bg-blue-600 text-white"
                onClick={() => setIsModalOpen(true)}
              >
                立即购买
              </Button>
            </div>
            <Modal
              title="确认购买"
              visible={isModalOpen}
              onCancel={() => setIsModalOpen(false)}
              footer={[
                <Button key="cancel" onClick={() => setIsModalOpen(false)}>
                  取消
                </Button>,
                <Button
                  key="confirm"
                  type="primary"
                  onClick={handlePurchase}
                >
                  确认购买
                </Button>,
              ]}
            >
              {selectedNft && (
                <div>
                  <p>您将购买以下NFT：</p>
                  <p>名称: {selectedNft.name}</p>
                  <p>价格: {getPriceById(selectedNft.id)} ETH</p>
                </div>
              )}
            </Modal>
          </div>

          {/* 商品交易历史 */}
          <div className="mt-12">
            <h2 className="text-2xl font-semibold mb-4">交易历史</h2>
            {transactionHistory.length === 0 ? (
              <p>暂无交易记录</p>
            ) : (
              <ul>
                {transactionHistory.map((tx, index) => (
                  <li key={index} className="mb-6">
                    <div className="text-sm text-gray-600">
                      <strong>卖家:</strong> {tx.seller}
                    </div>
                    <div className="text-sm text-gray-600">
                      <strong>买家:</strong> {tx.buyer}
                    </div>
                    <div className="text-sm text-gray-600">
                      <strong>交易价格:</strong> {tx.price} ETH
                    </div>
                    <div className="text-sm text-gray-600">
                      <strong>交易时间:</strong> {tx.timestamp}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default NFTDetailPage;

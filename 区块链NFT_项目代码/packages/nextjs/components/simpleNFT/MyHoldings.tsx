import { useEffect, useState } from "react";
import { NFTCard } from "./NFTCard";
import { useAccount } from "wagmi";
import { useScaffoldContract, useScaffoldContractWrite, useScaffoldContractRead } from "~~/hooks/scaffold-eth";
import { notification, message, Switch, Pagination, Input, Select, Button } from "antd";

export interface Collectible {
  image: string;
  id: number;
  name: string;
  attributes: { trait_type: string; value: string }[];
  owner: string;
  price: string;
  description: string;
  uri?: string;
  tokenId?: number;
  CID?: string;
}

export const MyHoldings = () => {
  const { address: connectedAddress } = useAccount();
  const [myAllCollectibles, setMyAllCollectibles] = useState<Collectible[]>([]);
  const [allCollectiblesLoading, setAllCollectiblesLoading] = useState(false);
  const [isListed, setIsListed] = useState<{ [key: number]: boolean }>({});
  const [isAuction, setIsAuction] = useState<{ [key: number]: boolean }>({});  // 新增的状态
  const [price, setPrice] = useState<{ [key: number]: string }>({});
  const [auctionPrice, setAuctionPrice] = useState<{ [key: number]: string }>({});  // 拍卖价格
  const [auctionDuration, setAuctionDuration] = useState<{ [key: number]: string }>({});  // 拍卖时长
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedTokenId, setSelectedTokenId] = useState<number | null>(null); // 存储选中的 tokenId
  const itemsPerPage = 6;

  const { data: yourCollectibleContract } = useScaffoldContract({
    contractName: "YourCollectible",
  });

  const { writeAsync: createAuction } = useScaffoldContractWrite({
    contractName: "YourCollectible",
    functionName: "createAuction",
    args: [0, 0, 0],
  });

  const { writeAsync: addAvailableToken } = useScaffoldContractWrite({
    contractName: "YourCollectible",
    functionName: "addAvailableToken",
    args: [0], // 默认 tokenId 为 0，需要动态传入
  });

  const { data: myTotalBalance } = useScaffoldContractRead({
    contractName: "YourCollectible",
    functionName: "balanceOf",
    args: [connectedAddress],
    watch: true,
  });

  const broadcastChannel = new BroadcastChannel('nft_channel');

  useEffect(() => {
    const updateMyCollectibles = async (): Promise<void> => {
      if (myTotalBalance === undefined || yourCollectibleContract === undefined || connectedAddress === undefined) return;

      setAllCollectiblesLoading(true);
      const collectibleUpdate: Collectible[] = [];

      const storedNFTs = localStorage.getItem("createdNFTs");

      let userNFTs: Collectible[] = [];
      if (storedNFTs) {
        const nfts = JSON.parse(storedNFTs);
        console.log('nfts', nfts);

        userNFTs = nfts.filter((nft: Collectible) => nft.owner === connectedAddress);
      }

      const totalBalance = parseInt(myTotalBalance.toString());

      for (let tokenIndex = 0; tokenIndex < totalBalance; tokenIndex++) {
        try {
          const tokenId = await yourCollectibleContract.read.tokenOfOwnerByIndex([connectedAddress, BigInt(tokenIndex)]);
          const tokenURI = await yourCollectibleContract.read.tokenURI([tokenId]);

          const localNFT = userNFTs.find((nft: Collectible) => nft.id === parseInt(tokenId.toString()));

          if (localNFT) {
            collectibleUpdate.push({
              ...localNFT,
              uri: tokenURI,
              tokenId: parseInt(tokenId.toString()),
            });
          }
        } catch (e) {
          setAllCollectiblesLoading(false);
          console.log(e);
        }
      }

      collectibleUpdate.push(...userNFTs.filter(nft => !collectibleUpdate.find(item => item.id === nft.id)));

      collectibleUpdate.sort((a, b) => a.id - b.id);
      setMyAllCollectibles(collectibleUpdate);
      setAllCollectiblesLoading(false);
    };

    updateMyCollectibles();

    broadcastChannel.onmessage = (event) => {
      const newNFT = event.data;
      const storedNFTs = JSON.parse(localStorage.getItem("createdNFTs") || "[]");
      const updatedNFTs = [...storedNFTs, newNFT];
      localStorage.setItem("createdNFTs", JSON.stringify(updatedNFTs));
      setMyAllCollectibles(prevCollectibles => [...prevCollectibles, newNFT]);
    };

    const interval = setInterval(updateMyCollectibles, 20000); // 每20秒轮询一次

    const storedListedNFTs = JSON.parse(localStorage.getItem("listedNFTs") || "[]");
    const listedState: { [key: number]: boolean } = {};
    const auctionState: { [key: number]: boolean } = {};  // 获取拍卖状态
    const priceState: { [key: number]: string } = {};
    storedListedNFTs.forEach((nft: { id: number, price: string, isAuction: boolean }) => {
      listedState[nft.id] = true;
      auctionState[nft.id] = nft.isAuction;  // 记录是否是拍卖
      priceState[nft.id] = nft.price;
    });
    setIsListed(listedState);
    setIsAuction(auctionState);
    setPrice(priceState);

    return () => {
      clearInterval(interval); // 在组件卸载时清除轮询
      broadcastChannel.close(); // 关闭广播通道
    };
  }, [connectedAddress, myTotalBalance]);

  const handleTransferSuccess = (id: number) => {
    setMyAllCollectibles(prevCollectibles => prevCollectibles.filter(item => item.id !== id));
  };

  const handleListToggle = async (checked: boolean, id: number) => {
    const storedNFTs = JSON.parse(localStorage.getItem("createdNFTs") || "[]");
    let allNFTs = JSON.parse(localStorage.getItem("allNFTs") || "[]");

    if (checked) {
      if (!price[id]) {
        message.error("请设置价格");
        return;
      }

      // 通过 id 和地址上架 NFT
      const listedNFTs = JSON.parse(localStorage.getItem("listedNFTs") || "[]");
      const isAuctionSelected = isAuction[id] || false;
      listedNFTs.push({ id, price: price[id], isAuction: isAuctionSelected, owner: connectedAddress });
      console.log('listedNFTs', listedNFTs)
      localStorage.setItem("listedNFTs", JSON.stringify(listedNFTs));

      const nft = storedNFTs.find((nft: Collectible) => nft.id === id && nft.owner == connectedAddress);
      console.log('storedNFTs', storedNFTs)
      if (nft) {
        allNFTs.push({ ...nft, isListed: true });
        localStorage.setItem("allNFTs", JSON.stringify(allNFTs));
      }

      message.success("上架成功");
    } else {
      const listedNFTs = JSON.parse(localStorage.getItem("listedNFTs") || "[]");
      const updatedNFTs = listedNFTs.filter((item: { id: number }) => item.id !== id);
      localStorage.setItem("listedNFTs", JSON.stringify(updatedNFTs));

      allNFTs = allNFTs.filter((nft: Collectible) => nft.id !== id);
      localStorage.setItem("allNFTs", JSON.stringify(allNFTs));

      message.success("下架成功");
    }
    setIsListed(prev => ({ ...prev, [id]: checked }));
  };


  //创建拍卖
  const handleAuctionToggle = async (checked: boolean, id: number) => {
    if (checked) {
      if (!auctionPrice[id] || !auctionDuration[id]) {
        message.error("请设置拍卖价格和拍卖持续时间");
        return;
      }

      try {
        // 调用智能合约创建拍卖
        await createAuction({
          args: [Number(id), Number(auctionPrice[id]), Number(auctionDuration[id])]
        });
        message.success("拍卖成功");
      } catch (e) {
        message.error("拍卖失败");
        console.error(e);
      }

      const auctionNFTs = JSON.parse(localStorage.getItem("listedNFTs") || "[]");
      auctionNFTs.push({ id, price: auctionPrice[id], isAuction: true, owner: connectedAddress });
      localStorage.setItem("listedNFTs", JSON.stringify(auctionNFTs));

      setIsAuction(prev => ({ ...prev, [id]: true }));
    } else {
      const auctionNFTs = JSON.parse(localStorage.getItem("listedNFTs") || "[]");
      const updatedAuctionNFTs = auctionNFTs.filter((item: { id: number }) => item.id !== id);
      localStorage.setItem("listedNFTs", JSON.stringify(updatedAuctionNFTs));

      setIsAuction(prev => ({ ...prev, [id]: false }));
      message.success("取消拍卖成功");
    }
  };

  // 创建盲盒
  const handleCreateBlindBox = async () => {
    if (selectedTokenId === null) {
      message.error("请选择一个NFT");
      return;
    }

    try {
      await addAvailableToken({ args: [selectedTokenId] });
      message.success("盲盒创建成功");
    } catch (e) {
      message.error("盲盒创建失败");
      console.error(e);
    }
  };


  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const paginatedNFTs = myAllCollectibles.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  console.log('paginatedNFTs', paginatedNFTs);

  return (
    <>

      {myAllCollectibles.length === 0 ? (
        <div className="flex justify-center items-center mt-10">
          <div className="text-2xl text-primary-content">No NFTs found</div>
        </div>
      ) : (
        <div className="flex flex-wrap gap-4 my-8 px-5 justify-center">
          <div>
            <Input
              value={selectedTokenId ?? ''}
              onChange={(e) => setSelectedTokenId(e.target.value)}
              style={{ width: 200 }}
              placeholder="请输入Token ID"
            />
            <Button onClick={handleCreateBlindBox}>创建盲盒</Button>
          </div>

          {paginatedNFTs.map((item) => (
            <div key={item.id}>
              <NFTCard nft={item} onTransferSuccess={handleTransferSuccess} />
              <div className="card-actions justify-center">
                <div className="flex flex-row items-center">
                  <span className="mr-3">上架</span>
                  <Switch checked={isListed[item.id] || false} onChange={(checked: any) => handleListToggle(checked, item.id)} />
                  <input
                    type="text"
                    value={price[item.id] || ""}
                    onChange={(e) => setPrice(prev => ({ ...prev, [item.id]: e.target.value }))}
                    placeholder="设置价格"
                    disabled={isListed[item.id]}
                    className="border ml-3 p-2"
                  />
                </div>
                <br></br>
                <div className="flex flex-row items-center">
                  <Switch
                    checked={isAuction[item.id] || false}
                    onChange={(checked: any) => handleAuctionToggle(checked, item.id)}
                    className="ml-3"
                  />
                  <span className="ml-3">拍卖</span>
                  <>
                    <Input
                      value={auctionPrice[item.id] || ""}
                      onChange={(e) => setAuctionPrice(prev => ({ ...prev, [item.id]: e.target.value }))}
                      placeholder="拍卖价格"
                      className="border ml-3"
                    />
                    <Input
                      value={auctionDuration[item.id] || ""}
                      onChange={(e) => setAuctionDuration(prev => ({ ...prev, [item.id]: e.target.value }))}
                      placeholder="拍卖持续时间"
                      className="border ml-3"
                    />
                  </>

                </div>
              </div>
            </div>
          ))}
        </div>
      )}
      <Pagination
        current={currentPage}
        pageSize={itemsPerPage}
        total={myAllCollectibles.length}
        onChange={handlePageChange}
        style={{ marginTop: "2rem", textAlign: "center" }}
      />
    </>
  );
};

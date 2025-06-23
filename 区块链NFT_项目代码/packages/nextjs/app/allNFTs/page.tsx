"use client";

import { useState, useEffect } from "react";
import type { NextPage } from "next";
import { Input, Pagination } from "antd";
import Link from "next/link";  // 导入 Link 组件

interface Collectible {
  image: string;
  id: number;
  name: string;
  owner: string;
  description: string;
  category: string;  // 新增类别字段
}

interface ListedNftInfo {
  id: number;
  price: string;
}

const AllNFTs: NextPage = () => {
  const [allNFTs, setAllNFTs] = useState<Collectible[]>([]);
  const [listedNFTs, setListedNFTs] = useState<ListedNftInfo[]>([]);
  const [searchText, setSearchText] = useState("");
  const [filteredNFTs, setFilteredNFTs] = useState<Collectible[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 6;

  // 从本地存储加载NFT数据
  useEffect(() => {
    const storedAllNFTs = localStorage.getItem("allNFTs");
    const storedListedNFTs = localStorage.getItem("listedNFTs");
    if (storedAllNFTs) {
      const nfts = JSON.parse(storedAllNFTs);
      setAllNFTs(nfts);
      setFilteredNFTs(nfts);
    }
    if (storedListedNFTs) {
      const listed = JSON.parse(storedListedNFTs);
      setListedNFTs(listed);
    }
  }, []);

  // 搜索功能，支持通过名字和类别过滤
  const handleSearch = (value: string) => {
    setSearchText(value);
    if (value.trim() === "") {
      setFilteredNFTs(allNFTs);
    } else {
      const filtered = allNFTs.filter((nft) =>
        nft.name.toLowerCase().includes(value.toLowerCase())
      );
      setFilteredNFTs(filtered);
      setCurrentPage(1); // 重置到第一页
    }
  };
  useEffect(() => {
    const filtered = allNFTs.filter((nft) =>
      nft.name.toLowerCase().includes(searchText.toLowerCase())
    );
    setFilteredNFTs(filtered);
    setCurrentPage(1); // 重置到第一页
  }, [searchText, allNFTs]);

  const getPriceById = (id: number) => {
    const listedNft = listedNFTs.find((nft) => nft.id === id);
    return listedNft ? listedNft.price : "N/A";
  };

  // 分页后的数据
  const paginatedNFTs = filteredNFTs.slice(0, itemsPerPage);

  return (
    <>
      <div className="flex items-center flex-col pt-10">
        <div className="px-5">
          <h1 className="text-center mb-8">
            <span className="block text-4xl font-bold">NFT市场</span>
          </h1>
          <div className="flex justify-center mb-8">
            <Input.Search
              placeholder="输入NFT名称"
              value={searchText}
              onChange={(e: any) => setSearchText(e.target.value)}
              onSearch={handleSearch}
              enterButton
              style={{ width: 400 }}
            />
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4">
        <div className="flex flex-wrap justify-center">
          {paginatedNFTs.length === 0 ? (
            <div className="text-2xl text-primary-content">暂无在售NFT</div>
          ) : (
            paginatedNFTs.map((nft) => (
              <Link key={nft.id} href={`/allNFTs/${nft.id}`} passHref>
                <div
                  className="card card-compact bg-base-100 shadow-lg sm:min-w-[300px] shadow-secondary cursor-pointer"
                  style={{ margin: "1rem" }}
                >
                  <figure className="relative">
                    <img
                      src={nft.image}
                      alt="NFT Image"
                      className="h-60 min-w-full"
                    />
                  </figure>
                  <div className="card-body space-y-3">
                    <div className="flex items-center justify-center">
                      <p className="text-xl p-0 m-0 font-semibold">{nft.name}</p>
                    </div>
                    <div className="flex space-x-3 mt-1 items-center">
                      <span className="text-lg font-semibold">价格：{getPriceById(nft.id)} ETH</span>
                    </div>
                    <div className="flex flex-wrap space-x-2 mt-1">
                      {nft.attributes?.map((attr, index) => (
                        <span key={index} className="badge badge-primary py-3">
                          {attr.trait_type}: {attr.value}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </Link>
            ))
          )}
        </div>
        <Pagination
          current={1}
          pageSize={itemsPerPage}
          total={filteredNFTs.length}
          style={{ marginTop: "2rem", textAlign: "center" }}
        />
      </div>
    </>
  );
};

export default AllNFTs;

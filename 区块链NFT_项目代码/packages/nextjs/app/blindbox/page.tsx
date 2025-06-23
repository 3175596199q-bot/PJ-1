"use client";

import { useState } from "react";
import { useScaffoldContract, useScaffoldContractRead, useScaffoldContractWrite } from "~~/hooks/scaffold-eth";
import { useAccount } from "wagmi";
import { message, Button, Input, Card } from "antd";

const Blindbox = () => {
  const { address } = useAccount(); // 获取当前用户地址
  const [isLoading, setIsLoading] = useState(false);

  // 合约实例
  const { data: yourCollectibleContract } = useScaffoldContract({
    contractName: "YourCollectible",
  });

  // 获取可用的盲盒 Token 列表
  const { data: getAvailableTokens } = useScaffoldContractRead({
    contractName: "YourCollectible",
    functionName: "getAvailableTokens",
    watch: true,
    cacheOnBlock: true,
  });

  // 调用合约中的抽取盲盒功能
  const { writeAsync: buyMysteryBox } = useScaffoldContractWrite({
    contractName: "YourCollectible",
    functionName: "buyMysteryBox",
    value: BigInt(0.1* 10 ** 18),
  });

  // 处理盲盒抽取
  const handleDrawBlindBox = async () => {
    try {
      setIsLoading(true);
      await buyMysteryBox();
      message.success("盲盒抽取成功！");
    } catch (error) {
      message.error("盲盒抽取失败，请检查输入的 Token ID 或稍后重试！");
    } finally {
      setIsLoading(false);
    }
  };

console.log('getAvailableTokens',getAvailableTokens)
  return (
    <div style={{ padding: "20px", maxWidth: "500px", margin: "0 auto" }}>
      <h2>盲盒抽取页面</h2>

      <Card title="我的盲盒">
        {getAvailableTokens && getAvailableTokens.length > 0 ? (
          <ul>
            {getAvailableTokens.map((tokenId) => (
              <li key={tokenId}>Token ID: {tokenId}</li>
            ))}
          </ul>
        ) : (
          <p>暂无可用的盲盒 Token。</p>
        )}
      </Card>

      <div style={{ marginTop: "20px" }}>
        <Button
          type="primary"
          onClick={handleDrawBlindBox}
          loading={isLoading}
          style={{ width: "100%" }}
        >
          抽取盲盒
        </Button>
      </div>
    </div>
  );
};

export default Blindbox;

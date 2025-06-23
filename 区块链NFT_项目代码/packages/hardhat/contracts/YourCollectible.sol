// SPDX-License-Identifier: MIT
pragma solidity ^0.8.2;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol"; // 导入 ERC721 标准合约
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol"; // 导入 ERC721 可枚举扩展
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol"; // 导入 ERC721 URI 存储扩展
import "@openzeppelin/contracts/access/Ownable.sol"; // 导入 Ownable 合约，用于所有权控制
import "@openzeppelin/contracts/utils/Counters.sol"; // 导入 Counters 库，用于计数操作

contract YourCollectible is ERC721, ERC721Enumerable, ERC721URIStorage, Ownable {
    using Counters for Counters.Counter; // 使用 Counters 库进行计数操作

    Counters.Counter public tokenIdCounter; // 用于跟踪令牌 ID 的计数器
    mapping(uint256 => uint256) public tokenPrices; // 用于存储令牌价格的映射

    mapping(uint256 => address) private _creators; // 每个tokenId的创作者地址
    uint256 public royaltyPercentage = 5; // 版税百分比，默认设置为5%

    struct TransactionHistory {
        address seller;
        address buyer;
        uint256 price;
        uint256 timestamp;
    }
    mapping(uint256 => TransactionHistory[]) public tokenTransactionHistory; // 每个 tokenId 对应的交易历史记录



    // 构造函数，初始化合约并设置合约名称和代币符号
    constructor() ERC721("YourCollectible", "ETH") {}

    // 覆盖 _baseURI 函数，返回一个空字符串
    function _baseURI() internal pure override returns (string memory) {
        return "";
    }

    // 铸造NFT
    function mintItem(address to, string memory uri) public returns (uint256) {
        tokenIdCounter.increment(); // 增加NFT ID
        uint256 tokenId = tokenIdCounter.current(); // 获取当前的NFT ID
        _safeMint(to, tokenId); // 安全地铸造NFT
        _setTokenURI(tokenId, uri); // 设置NFT URI
	    _creators[tokenId] = msg.sender;//记录创作者地址

        tokenTransactionHistory[tokenId].push(TransactionHistory({
            seller: to,  //买家
            buyer: address(0),  //卖家
            price: 0,
            timestamp: block.timestamp
        }));

        return tokenId; // 返回NFT ID
    }

    // 设置版税百分比
    function setRoyaltyPercentage(uint256 percentage) public onlyOwner {
        royaltyPercentage = percentage;
    }

    // Solidity要求的覆盖函数
    function _beforeTokenTransfer(
        address from,
        address to,
        uint256 tokenId,
        uint256 batchSize
    ) internal override(ERC721, ERC721Enumerable) {
        super._beforeTokenTransfer(from, to, tokenId, batchSize); // 调用父类的 _beforeTokenTransfer
    }

    mapping(uint256 => uint256) public holdingStartTime; // 持有NFT的开始时间
    mapping(uint256 => bool) public loyaltyRewardClaimed; // 是否已领取忠诚度奖励

    uint256 public loyaltyPeriod = 30 days; // 忠诚度奖励的持有期
    // 持有NFT时记录开始时间
    function _transfer(address from, address to, uint256 tokenId) internal override {
        super._transfer(from, to, tokenId);
        holdingStartTime[tokenId] = block.timestamp;
        loyaltyRewardClaimed[tokenId] = false; // 转移时重置忠诚奖励领取状态
    }

    // 覆盖 _burn 函数
    function _burn(uint256 tokenId) internal override(ERC721URIStorage, ERC721) {
        super._burn(tokenId); // 调用父类的 _burn
    }

    // 覆盖 tokenURI 函数
    function tokenURI(uint256 tokenId) public view override(ERC721URIStorage, ERC721) returns (string memory) {
        return super.tokenURI(tokenId); // 调用父类的 tokenURI
    }

    // 覆盖 supportsInterface 函数
    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(ERC721, ERC721Enumerable, ERC721URIStorage)
        returns (bool)
    {
        return super.supportsInterface(interfaceId); // 调用父类的 supportsInterface
    }

    // 购买方法
    function purchase(
        uint256 tokenId,
        address from,
        address to,
        uint256 price,
        uint256 batchSize
    ) public payable {
        require(_exists(tokenId), "Token does not exist"); // 确保令牌存在
        require(from == ownerOf(tokenId), "From address is not the owner"); // 确保 from 地址是令牌的所有者
        require(msg.value == price, "Incorrect price"); // 确保发送的以太币数量与价格相符

    address creator = _creators[tokenId];
    
	//支付给作者的版税
	uint256 royaltyAmount = (msg.value * royaltyPercentage) / 100;
	//支付给拥有者的金额
        uint256 sellerAmount = msg.value - royaltyAmount;

	// 支付版税
        payable(creator).transfer(royaltyAmount);
        // 将价格转移给卖家
        payable(from).transfer(sellerAmount);
        // 调用 _beforeTokenTransfer 方法
        _beforeTokenTransfer(from, to, tokenId, batchSize);
        // 转移令牌
        _transfer(from, to, tokenId);

	// 记录交易历史
        tokenTransactionHistory[tokenId].push(TransactionHistory({
            seller: to,  //买家
            buyer: from,  //卖家
            price: price,
            timestamp: block.timestamp
        }));

    }

    // 新增函数：获取 tokenId 的交易历史
    function getTransactionHistory(uint256 tokenId) public view returns (TransactionHistory[] memory) {
        return tokenTransactionHistory[tokenId];
    }

    struct Auction {
        uint256 tokenId;
        address seller;
        uint256 minBid;
        uint256 highestBid;
        address highestBidder;
        uint256 endTime;
        bool isActive;
    }

    mapping(uint256 => Auction) public auctions; // 每个 tokenId 对应的拍卖信息

 // 创建拍卖
    function createAuction(uint256 tokenId, uint256 minPrice, uint256 duration) public {
        require(ownerOf(tokenId) == msg.sender, "Only the owner can create an auction");
        require(!auctions[tokenId].isActive, "The copyright is already in auction");

        auctions[tokenId] = Auction({
            tokenId: tokenId,
            seller: msg.sender,
            minBid: minPrice,
            highestBid: 0,
            highestBidder: address(0),
            endTime: block.timestamp + duration,
            isActive: true
        });
    }

// 返回所有拍卖的信息
function getAuctions(uint256 tokenId) public view returns (Auction memory) {
    return auctions[tokenId];
}

    // 出价
    function bid(uint256 tokenId) public payable {
        Auction storage auction = auctions[tokenId];
        require(auction.isActive, "This auction is not active");
        require(block.timestamp < auction.endTime, "The auction has ended");
        require(msg.value > auction.highestBid, "Bid is lower than the current highest bid");

        auction.highestBid = msg.value;
        auction.highestBidder = msg.sender;
    }

    // 结束拍卖并转移NFT
    function endAuction(uint256 tokenId) public {
        Auction storage auction = auctions[tokenId];
        require(auction.isActive, "Auction has already ended");
        require(block.timestamp >= auction.endTime, "Auction has not ended yet");

        auction.isActive = false;
        if (auction.highestBidder != address(0)) {
            _transfer(auction.seller, auction.highestBidder, tokenId);
            payable(auction.seller).transfer(auction.highestBid);
        }
    }

    uint256 public mysteryBoxPrice = 0.1 ether; // 盲盒价格
    uint256[] public availableTokens; // 可供选择的NFT tokenId列表

    // 盲盒功能
    function setMysteryBoxPrice(uint256 price) public {
        mysteryBoxPrice = price;
    }

    function addAvailableToken(uint256 tokenId) public {
        availableTokens.push(tokenId);
    }

    function getAvailableTokens() public view returns (uint256[] memory) {
        return availableTokens;
    }

    function buyMysteryBox() public payable returns (uint256) {
        require(msg.value == mysteryBoxPrice, "Incorrect price for mystery box");
        require(availableTokens.length > 0, "No available NFTs for the mystery box");

        uint256 randomIndex = uint256(keccak256(abi.encodePacked(block.timestamp, msg.sender))) % availableTokens.length;
        uint256 tokenId = availableTokens[randomIndex];

        availableTokens[randomIndex] = availableTokens[availableTokens.length - 1];
        availableTokens.pop();

        _transfer(ownerOf(tokenId), msg.sender, tokenId);
        return tokenId;
    }


    // 领取忠诚度奖励
    function claimLoyaltyReward(uint256 tokenId) public payable{
        require(ownerOf(tokenId) == msg.sender, "Only NFT owners can claim rewards");
        require(!loyaltyRewardClaimed[tokenId], "The loyalty reward has been claimed");
        require(
            block.timestamp >= holdingStartTime[tokenId] + loyaltyPeriod,
            "If you don't hold it for enough time, you can't claim the reward"
        );
        uint256 Id = tokenIdCounter.current();

        // 发送忠诚度奖励 (例如：ERC20 代币或其他奖励)
        _transfer(_creators[tokenId], msg.sender, tokenId);



        loyaltyRewardClaimed[tokenId] = true; // 标记为已领取
    }

    // 设置忠诚度奖励持有期
    function setLoyaltyPeriod(uint256 newPeriod) public onlyOwner {
        loyaltyPeriod = newPeriod;
    }


}
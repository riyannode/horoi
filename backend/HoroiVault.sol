// SPDX-License-Identifier: MIT
pragma solidity 0.8.37;

interface HoroiIERC20 {
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
    function transfer(address to, uint256 amount) external returns (bool);
}

/// @title HoroiVault
/// @notice Minimal transparent integration harness for one configured bStock asset.
/// @dev Raw token amounts remain canonical. No multiplier, fee, trading, governance,
///      arbitrary execution, or upgradeability is implemented here.
contract HoroiVault {
    address public immutable asset;
    uint256 public totalShares;
    uint256 public totalRawAssets;
    uint256 private entered;
    mapping(address => uint256) public balanceOf;

    error InvalidAsset();
    error InvalidAmount();
    error InvalidReceiver();
    error UnauthorizedOwner();
    error InsufficientShares();
    error TransferFailed();

    modifier nonReentrant() {
        if (entered != 0) revert TransferFailed();
        entered = 1;
        _;
        entered = 0;
    }

    event Deposit(address indexed caller, address indexed receiver, uint256 assets, uint256 shares);
    event Withdraw(
        address indexed caller, address indexed receiver, address indexed owner, uint256 assets, uint256 shares
    );

    constructor(address configuredAsset) {
        if (configuredAsset == address(0)) revert InvalidAsset();
        asset = configuredAsset;
    }

    function deposit(uint256 assets, address receiver) external nonReentrant returns (uint256 shares) {
        if (assets == 0) revert InvalidAmount();
        if (receiver == address(0)) revert InvalidReceiver();
        shares = totalShares == 0 ? assets : (assets * totalShares) / totalRawAssets;
        if (shares == 0) revert InvalidAmount();
        totalRawAssets += assets;
        totalShares += shares;
        balanceOf[receiver] += shares;
        if (!HoroiIERC20(asset).transferFrom(msg.sender, address(this), assets)) revert TransferFailed();
        emit Deposit(msg.sender, receiver, assets, shares);
    }

    function redeem(uint256 shares, address receiver, address owner) public nonReentrant returns (uint256 assets) {
        if (msg.sender != owner) revert UnauthorizedOwner();
        if (shares == 0 || shares > balanceOf[owner]) revert InsufficientShares();
        if (receiver == address(0)) revert InvalidReceiver();
        assets = previewRedeem(shares);
        balanceOf[owner] -= shares;
        totalShares -= shares;
        totalRawAssets -= assets;
        if (!HoroiIERC20(asset).transfer(receiver, assets)) revert TransferFailed();
        emit Withdraw(msg.sender, receiver, owner, assets, shares);
    }

    function withdraw(uint256 assets, address receiver, address owner) external returns (uint256 shares) {
        if (msg.sender != owner) revert UnauthorizedOwner();
        if (assets == 0 || assets > totalRawAssets) revert InvalidAmount();
        shares = (assets * totalShares + totalRawAssets - 1) / totalRawAssets;
        redeem(shares, receiver, owner);
    }

    function previewRedeem(uint256 shares) public view returns (uint256) {
        if (totalShares == 0) return 0;
        return (shares * totalRawAssets) / totalShares;
    }

    function convertToAssets(uint256 shares) external view returns (uint256) {
        return previewRedeem(shares);
    }

    function rawClaimOf(address owner) public view returns (uint256) {
        return previewRedeem(balanceOf[owner]);
    }
}

// SPDX-License-Identifier: Unlicense

pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";
import "contracts/utils/TokenRescue.sol";

// This contract allows to distribute dividends as any tokens to Sorty token holders (LP token of Mothership DAO)
// Workflow: send tokens to this contract and then call `distribute` with the token address
// You can also call `depositAndDistribute` if the correct amount as been approved on this contract.
contract SortyRevenueDistributor is TokenRescue {
  using SafeERC20 for IERC20Metadata;

  IERC20Metadata public constant SORTY = IERC20Metadata(0x41014B9a82cC0ea6BAc76f8406bfbEc65ADC0747);

  uint256 public constant RATE_DIVIDER = 10**18;

  address[] public holders;

  // TEST setHolders can only be called by owner
  // TEST when setHolders is called, the list is updated
  function setHolders(address[] memory holders_) external onlyOwner {
    delete holders;
    for (uint idx = 0; idx < holders_.length; ++idx) {
      holders.push(holders_[idx]);
    }
  }

  function holdersLength() public view returns (uint256) {
    return holders.length;
  }

  function distribute(IERC20Metadata token) external {
    _distribute(token);
  }

  function depositAndDistribute(IERC20Metadata token, uint256 amount) external {
    require(token.balanceOf(address(this)) == 0, "depositAndDistribute: initial balance of token should be 0");
    token.transferFrom(msg.sender, address(this), amount);
    _distribute(token);
  }

  function _distribute(IERC20Metadata token) private {
    uint256 totalAmount = token.balanceOf(address(this));

    // Compute weights before transfering token, to ensure the transfer does not change weights
    uint256[] memory weights = new uint256[](holders.length);
    uint256 weightsSum = 0;
    for (uint idx = 0; idx < holders.length; ++idx) {
      uint256 balance = SORTY.balanceOf(holders[idx]);
      weights[idx] = balance;
      weightsSum += balance;
    }

    for (uint idx = 0; idx < holders.length; ++idx) {
      uint256 amount = weights[idx] * totalAmount * RATE_DIVIDER / weightsSum / RATE_DIVIDER;
      token.transfer(holders[idx], amount);
    }
  }
}

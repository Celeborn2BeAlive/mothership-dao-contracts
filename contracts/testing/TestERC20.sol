// SPDX-License-Identifier: Unlicense

pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract TestERC20 is Ownable, ERC20 {
  uint8 private _decimals;
  constructor(string memory name_, string memory symbol_, uint256 initialSupply_, uint8 decimals_) ERC20(name_, symbol_) {
    _mint(msg.sender, initialSupply_);
    _decimals = decimals_;
  }

  function mint(uint256 amount) external onlyOwner {
    _mint(msg.sender, amount);
  }

  function mintTo(uint256 amount, address recipient) external onlyOwner {
    _mint(recipient, amount);
  }

  function decimals() public view virtual override returns (uint8) {
    return _decimals;
  }
}

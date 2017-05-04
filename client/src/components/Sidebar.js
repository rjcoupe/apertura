import React, { Component } from 'react';
import { Link } from 'react-router-dom';

import '../style/sidebar.css';

class SidebarItem {
  constructor(text, url) {
    this.text = text;
    this.url = url;
  }
}

export default class Sidebar extends Component {

  render() {
    const sidebarItems = [
      new SidebarItem('Home', '/'),
      new SidebarItem('Albums', '/albums'),
      new SidebarItem('Contact', '/contact'),
      new SidebarItem('Login', '/auth/google')
    ];
    return (
      <nav>
        <h1>rjcoupe</h1>
        <div className="sidebar-items-container">
          {sidebarItems.map((item) => {
            return (
              <Link to={item.url}>
                <div className="sidebar-item">
                  {item.text}
                </div>
              </Link>
            )
          })}
        </div>
        <div className="social-media">

        </div>
      </nav>
    );
  }
}
